using InformationFlowToolkit.Converter.Models;

namespace InformationFlowToolkit.Converter;

public class ConversionResult
{
    public InformationFlowDocument Document { get; set; } = new();
    public List<ConversionWarning> Warnings { get; set; } = new();
    public ConversionStatistics Statistics { get; set; } = new();
}

public class ConversionWarning
{
    public string Category { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? SourceElement { get; set; }
}

public class ConversionStatistics
{
    public int TotalSlices { get; set; }
    public int ConvertedEvents { get; set; }
    public int ConvertedCommands { get; set; }
    public int ConvertedStateViews { get; set; }
    public int ConvertedActors { get; set; }
    public int SkippedScreens { get; set; }
    public int SkippedProcessors { get; set; }
    public int TotalTimelineElements { get; set; }
}

public class Converter
{
    private readonly List<ConversionWarning> _warnings = new();
    private readonly ConversionStatistics _stats = new();
    private int _currentTick = 10;
    private const int TickIncrement = 10;

    // Maps to track elements for linking
    private readonly Dictionary<string, string> _eventIdToName = new();
    private readonly Dictionary<string, string> _commandIdToName = new();
    private readonly Dictionary<string, string> _readModelIdToName = new();
    private readonly Dictionary<string, int> _commandNameToTick = new();

    public ConversionResult Convert(DilgerModel source, string name)
    {
        var result = new ConversionResult();
        var document = new InformationFlowDocument
        {
            Name = name,
            Description = $"Converted from Dilger format. Context: {source.Context ?? "unknown"}",
            Version = "1.0.0"
        };

        _stats.TotalSlices = source.Slices.Count;

        // First pass: collect all element IDs and names
        CollectElementMappings(source);

        // Second pass: convert slices in order
        foreach (var slice in source.Slices.OrderBy(s => s.Index))
        {
            ConvertSlice(slice, document);
        }

        _stats.TotalTimelineElements = document.Timeline.Count;

        result.Document = document;
        result.Warnings = _warnings;
        result.Statistics = _stats;

        return result;
    }

    private void CollectElementMappings(DilgerModel source)
    {
        foreach (var slice in source.Slices)
        {
            foreach (var evt in slice.Events)
            {
                _eventIdToName[evt.Id] = NormalizeName(evt.Title);
            }
            foreach (var cmd in slice.Commands)
            {
                _commandIdToName[cmd.Id] = NormalizeName(cmd.Title);
            }
            foreach (var rm in slice.ReadModels)
            {
                _readModelIdToName[rm.Id] = NormalizeName(rm.Title);
            }
        }
    }

    private void ConvertSlice(DilgerSlice slice, InformationFlowDocument document)
    {
        // Determine the actor for this slice
        var sliceActor = slice.Actors.FirstOrDefault()?.Name ?? "System";

        // For STATE_CHANGE slices: typically Command → Event flow
        // For STATE_VIEW slices: typically Event → View flow

        if (slice.SliceType == "STATE_CHANGE")
        {
            ConvertStateChangeSlice(slice, document, sliceActor);
        }
        else if (slice.SliceType == "STATE_VIEW")
        {
            ConvertStateViewSlice(slice, document);
        }
        else
        {
            AddWarning("UnknownSliceType", $"Unknown slice type: {slice.SliceType}", slice.Title);
        }
    }

    private void ConvertStateChangeSlice(DilgerSlice slice, InformationFlowDocument document, string actorName)
    {
        foreach (var command in slice.Commands)
        {
            // Find related events (outbound dependencies)
            var producedEvents = command.Dependencies
                .Where(d => d.Type == "OUTBOUND" && d.ElementType == "EVENT")
                .Select(d => d.Title)
                .ToList();

            // Find the view that triggers this command (inbound from screen)
            var triggeringScreen = command.Dependencies
                .FirstOrDefault(d => d.Type == "INBOUND" && d.ElementType == "SCREEN");

            var triggeringReadModel = command.Dependencies
                .FirstOrDefault(d => d.Type == "INBOUND" && d.ElementType == "READMODEL");

            var triggeringAutomation = command.Dependencies
                .FirstOrDefault(d => d.Type == "INBOUND" && d.ElementType == "AUTOMATION");

            string? viewName = null;
            if (triggeringReadModel != null)
            {
                viewName = NormalizeName(triggeringReadModel.Title);
            }
            else if (triggeringScreen != null)
            {
                // Try to find the readmodel that feeds the screen
                var screen = slice.Screens.FirstOrDefault(s => s.Id == triggeringScreen.Id);
                var screenReadModel = screen?.Dependencies
                    .FirstOrDefault(d => d.Type == "INBOUND" && d.ElementType == "READMODEL");
                if (screenReadModel != null)
                {
                    viewName = NormalizeName(screenReadModel.Title);
                }
            }

            // If triggered by automation, it's a bot/system actor
            bool isAutomation = triggeringAutomation != null;
            if (isAutomation)
            {
                actorName = "Bots";
                // Find the readmodel(s) that feed the automation
                var automation = slice.Processors.FirstOrDefault(p => p.Id == triggeringAutomation!.Id);
                var automationReadModel = automation?.Dependencies
                    .FirstOrDefault(d => d.Type == "INBOUND" && d.ElementType == "READMODEL");
                if (automationReadModel != null)
                {
                    viewName = NormalizeName(automationReadModel.Title);
                }
            }

            // Add Actor if we have a view
            if (!string.IsNullOrEmpty(viewName))
            {
                var actor = new ActorTimelineElement
                {
                    Name = actorName,
                    Tick = _currentTick,
                    ReadsView = viewName,
                    SendsCommand = NormalizeName(command.Title)
                };
                document.Timeline.Add(actor);
                _currentTick += TickIncrement;
                _stats.ConvertedActors++;
            }

            // Add Command
            var commandElement = new CommandTimelineElement
            {
                Name = NormalizeName(command.Title),
                Tick = _currentTick,
                Example = CreateExampleFromFields(command.Fields)
            };
            document.Timeline.Add(commandElement);
            _commandNameToTick[commandElement.Name] = _currentTick;
            _currentTick += TickIncrement;
            _stats.ConvertedCommands++;

            // Add produced Events
            foreach (var evt in slice.Events.Where(e => producedEvents.Contains(e.Title)))
            {
                var eventElement = new EventTimelineElement
                {
                    Name = NormalizeName(evt.Title),
                    Tick = _currentTick,
                    ProducedBy = $"{NormalizeName(command.Title)}-{_commandNameToTick[NormalizeName(command.Title)]}",
                    Example = CreateExampleFromFields(evt.Fields)
                };

                // Check if external event
                if (evt.Context == "EXTERNAL")
                {
                    eventElement.ExternalSource = "External System";
                    eventElement.ProducedBy = null;
                }

                document.Timeline.Add(eventElement);
                _currentTick += TickIncrement;
                _stats.ConvertedEvents++;
            }
        }

        // Track skipped elements
        _stats.SkippedScreens += slice.Screens.Count;
        _stats.SkippedProcessors += slice.Processors.Count;

        foreach (var screen in slice.Screens)
        {
            AddWarning("SkippedScreen", $"Screen '{screen.Title}' cannot be represented in target format", slice.Title);
        }

        foreach (var processor in slice.Processors)
        {
            AddWarning("SkippedProcessor", $"Processor/Automation '{processor.Title}' converted to Bot actor", slice.Title);
        }
    }

    private void ConvertStateViewSlice(DilgerSlice slice, InformationFlowDocument document)
    {
        foreach (var readModel in slice.ReadModels)
        {
            // Find events that feed this readmodel
            var inboundEvents = readModel.Dependencies
                .Where(d => d.Type == "INBOUND" && d.ElementType == "EVENT")
                .Select(d => NormalizeName(d.Title))
                .ToList();

            var stateView = new StateViewTimelineElement
            {
                Name = NormalizeName(readModel.Title),
                Tick = _currentTick,
                SourcedFrom = inboundEvents,
                Example = CreateExampleFromFields(readModel.Fields)
            };

            document.Timeline.Add(stateView);
            _currentTick += TickIncrement;
            _stats.ConvertedStateViews++;
        }

        // Screens in STATE_VIEW slices are typically just displaying readmodels
        _stats.SkippedScreens += slice.Screens.Count;
    }

    private Dictionary<string, object>? CreateExampleFromFields(List<DilgerField> fields)
    {
        if (fields.Count == 0)
            return null;

        var example = new Dictionary<string, object>();
        foreach (var field in fields)
        {
            var value = GetExampleValueForType(field);
            example[field.Name] = value;
        }
        return example;
    }

    private object GetExampleValueForType(DilgerField field)
    {
        // Use provided example if available
        if (!string.IsNullOrEmpty(field.Example))
            return field.Example;

        // Generate example based on type
        return field.Type switch
        {
            "UUID" => "550e8400-e29b-41d4-a716-446655440000",
            "String" => $"example-{field.Name}",
            "Double" => 99.99,
            "Int" => 100,
            "Boolean" => true,
            "Custom" when field.Cardinality == "List" => new List<object> { new Dictionary<string, object> { ["id"] = "item-1" } },
            _ => $"<{field.Type}>"
        };
    }

    private static string NormalizeName(string title)
    {
        // Convert "Add Item" to "AddItem", "cart items" to "CartItems"
        var words = title.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join("", words.Select(w => char.ToUpper(w[0]) + w[1..].ToLower()));
    }

    private void AddWarning(string category, string message, string? sourceElement = null)
    {
        _warnings.Add(new ConversionWarning
        {
            Category = category,
            Message = message,
            SourceElement = sourceElement
        });
    }
}
