using System.Text.Json;
using EventModelingParser.Models;
using NJsonSchema;
using Spectre.Console;
using Spectre.Console.Json;
using Spectre.Console.Rendering;

if (args.Length == 0)
{
    AnsiConsole.MarkupLine("[red]Usage:[/] EventModelingParser <path-to-eventmodel.json> [--schema <path-to-schema.json>] [--view timeline|slice]");
    return 1;
}

var filePath = args[0];
string? schemaPath = null;
string viewMode = "timeline";

for (int i = 1; i < args.Length; i++)
{
    if (args[i] == "--schema" && i + 1 < args.Length)
    {
        schemaPath = args[++i];
    }
    else if (args[i] == "--view" && i + 1 < args.Length)
    {
        viewMode = args[++i].ToLower();
    }
}

if (!File.Exists(filePath))
{
    AnsiConsole.MarkupLine($"[red]Error:[/] File not found: {filePath}");
    return 1;
}

var json = await File.ReadAllTextAsync(filePath);

// Schema validation
if (schemaPath != null)
{
    if (!File.Exists(schemaPath))
    {
        AnsiConsole.MarkupLine($"[red]Error:[/] Schema file not found: {schemaPath}");
        return 1;
    }

    AnsiConsole.MarkupLine("[dim]Validating against schema...[/]");
    var schemaJson = await File.ReadAllTextAsync(schemaPath);
    var schema = await JsonSchema.FromJsonAsync(schemaJson);
    var errors = schema.Validate(json);

    if (errors.Count > 0)
    {
        AnsiConsole.MarkupLine($"[red]Schema validation failed with {errors.Count} error(s):[/]");
        foreach (var error in errors)
        {
            AnsiConsole.MarkupLine($"  [red]•[/] {Markup.Escape(error.Path)}: {error.Kind}");
        }
        return 1;
    }

    AnsiConsole.MarkupLine("[green]✓ Schema validation passed![/]");
    AnsiConsole.WriteLine();
}

// Parse the model
EventModel model;
try
{
    model = JsonSerializer.Deserialize<EventModel>(json) 
        ?? throw new JsonException("Failed to deserialize event model");
}
catch (JsonException ex)
{
    AnsiConsole.MarkupLine($"[red]Error parsing JSON:[/] {ex.Message}");
    return 1;
}

// Render based on view mode
if (viewMode == "slice")
{
    RenderSliceView(model);
}
else
{
    RenderTimeline(model);
}

return 0;

void RenderSliceView(EventModel model)
{
    // Header
    var rule = new Rule($"[bold cyan]{Markup.Escape(model.Name)}[/] [dim](Slice View)[/]")
    {
        Justification = Justify.Center,
        Style = Style.Parse("cyan")
    };
    AnsiConsole.Write(rule);
    
    if (!string.IsNullOrEmpty(model.Version))
    {
        AnsiConsole.MarkupLine($"[dim]Version {model.Version}[/]");
    }
    
    AnsiConsole.WriteLine();
    
    // Collect all elements
    var events = model.Timeline.OfType<EventElement>().ToList();
    var actors = model.Timeline.OfType<ActorElement>().ToList();
    
    // Build lookup: which events are produced by which command (by tick)
    var eventsByCommandTick = events
        .Where(e => !string.IsNullOrEmpty(e.ProducedBy))
        .GroupBy(e => e.ProducedBy!) // Full "CommandName-Tick"
        .ToDictionary(g => g.Key, g => g.ToList());
    
    // Get slices: StateViews and Commands, sorted by tick
    var slices = model.Timeline
        .Where(e => e is StateViewElement || e is CommandElement)
        .OrderBy(e => e.Tick)
        .ToList();
    
    for (int i = 0; i < slices.Count; i++)
    {
        var slice = slices[i];
        var isLast = i == slices.Count - 1;
        var content = new List<string>();
        string title;
        Color borderColor;
        string symbol;
        
        switch (slice)
        {
            case StateViewElement sv:
                title = $"[green]◆[/] {Markup.Escape(sv.Name)}";
                borderColor = Color.Green;
                symbol = "[green]◆[/]";
                
                // Events this view subscribes to
                if (sv.SubscribesTo.Count > 0)
                {
                    content.Add("[dim]subscribesTo:[/]");
                    foreach (var eventName in sv.SubscribesTo)
                    {
                        var evt = events.FirstOrDefault(e => e.Name == eventName);
                        var tickInfo = evt != null ? $" [dim]@{evt.Tick}[/]" : "";
                        content.Add($"  [orange1]● {Markup.Escape(eventName)}[/]{tickInfo}");
                    }
                }
                
                // Actors that read this view
                var readingActors = actors.Where(a => a.ReadsView == sv.Name).ToList();
                if (readingActors.Any())
                {
                    if (content.Count > 0) content.Add("");
                    content.Add("[dim]readBy:[/]");
                    foreach (var actor in readingActors)
                    {
                        content.Add($"  [white]○ {Markup.Escape(actor.Name)}[/] [dim]@{actor.Tick}[/] → [blue]{Markup.Escape(actor.SendsCommand)}[/]");
                    }
                }
                
                // Example data handled separately
                
                break;
                
            case CommandElement cmd:
                title = $"[blue]▶[/] {Markup.Escape(cmd.Name)}";
                borderColor = Color.Blue;
                symbol = "[blue]▶[/]";
                
                // Actors that trigger this command
                var triggeringActors = actors.Where(a => a.SendsCommand == cmd.Name).ToList();
                if (triggeringActors.Any())
                {
                    content.Add("[dim]triggeredBy:[/]");
                    foreach (var actor in triggeringActors)
                    {
                        content.Add($"  [white]○ {Markup.Escape(actor.Name)}[/] [dim]@{actor.Tick}[/] ← [green]{Markup.Escape(actor.ReadsView)}[/]");
                    }
                }
                
                // Events produced by this command
                var cmdKey = $"{cmd.Name}-{cmd.Tick}";
                if (eventsByCommandTick.TryGetValue(cmdKey, out var producedEvents))
                {
                    if (content.Count > 0) content.Add("");
                    content.Add("[dim]produces:[/]");
                    foreach (var evt in producedEvents.OrderBy(e => e.Tick))
                    {
                        content.Add($"  [orange1]● {Markup.Escape(evt.Name)}[/] [dim]@{evt.Tick}[/]");
                    }
                }
                
                // Example data handled separately
                
                break;
                
            default:
                title = slice.Name;
                borderColor = Color.Grey;
                symbol = "?";
                break;
        }
        
        // Calculate extra lines based on tick distance
        int extraLines = 0;
        if (!isLast)
        {
            var nextSlice = slices[i + 1];
            var tickDistance = nextSlice.Tick - slice.Tick;
            extraLines = Math.Max(0, (tickDistance / 10) - 1);
        }
        
        var line = isLast ? "↓" : "│";
        var tickStr = $"@{slice.Tick}".PadLeft(5);
        
        // Timeline prefix
        AnsiConsole.MarkupLine($"{symbol} [dim]{tickStr} │[/]");
        
        // Get example data if available
        object? exampleData = slice switch
        {
            StateViewElement sv => sv.Example,
            CommandElement cmd => cmd.Example,
            _ => null
        };
        
        // Build panel content with JSON first, then details
        IRenderable panelContent;
        if (exampleData != null)
        {
            var exampleJson = JsonSerializer.Serialize(exampleData, new JsonSerializerOptions { WriteIndented = true });
            var jsonContent = new JsonText(exampleJson);
            
            if (content.Count > 0)
            {
                // JSON first, then empty line, then details
                var textContent = new Markup(string.Join("\n", content));
                panelContent = new Rows(jsonContent, new Text(""), textContent);
            }
            else
            {
                panelContent = jsonContent;
            }
        }
        else
        {
            panelContent = new Markup(string.Join("\n", content.Count > 0 ? content : new[] { "[dim](no details)[/]" }));
        }
        
        var panel = new Panel(panelContent)
        {
            Header = new PanelHeader(title),
            Border = BoxBorder.Rounded,
            BorderStyle = new Style(borderColor),
            Padding = new Padding(1, 0, 1, 0),
            Expand = true
        };
        
        AnsiConsole.Write(panel);
        
        // Timeline continuation
        if (!isLast)
        {
            AnsiConsole.MarkupLine($"        [dim]│[/]");
            for (int j = 0; j < extraLines; j++)
            {
                AnsiConsole.MarkupLine($"        [dim]│[/]");
            }
        }
        else
        {
            AnsiConsole.MarkupLine($"        [dim]↓[/]");
        }
    }
    
    // External Events (standalone, not produced by any command)
    var externalEvents = events.Where(e => !string.IsNullOrEmpty(e.ExternalSource)).ToList();
    if (externalEvents.Any())
    {
        AnsiConsole.MarkupLine("[dim]─────────────────────────────────────────[/]");
        AnsiConsole.MarkupLine("[orange1 bold]● EXTERNAL EVENTS[/]");
        
        foreach (var evt in externalEvents.OrderBy(e => e.Tick))
        {
            AnsiConsole.MarkupLine($"  [orange1]{Markup.Escape(evt.Name)}[/] [dim]@{evt.Tick}[/]");
            AnsiConsole.MarkupLine($"    [dim]source:[/] {Markup.Escape(evt.ExternalSource!)}");
        }
    }
}

void RenderTimeline(EventModel model)
{
    // Header
    var rule = new Rule($"[bold cyan]{Markup.Escape(model.Name)}[/]")
    {
        Justification = Justify.Center,
        Style = Style.Parse("cyan")
    };
    AnsiConsole.Write(rule);
    
    if (!string.IsNullOrEmpty(model.Version))
    {
        AnsiConsole.MarkupLine($"[dim]Version {model.Version}[/]");
    }
    
    if (!string.IsNullOrEmpty(model.Description))
    {
        AnsiConsole.MarkupLine($"[dim italic]{Markup.Escape(model.Description)}[/]");
    }
    
    AnsiConsole.WriteLine();

    // Timeline - sorted by tick, with spacing based on tick distance
    var sortedTimeline = model.Timeline.OrderBy(e => e.Tick).ToList();
    
    for (int i = 0; i < sortedTimeline.Count; i++)
    {
        var element = sortedTimeline[i];
        var isLast = i == sortedTimeline.Count - 1;
        
        // Calculate spacing based on tick distance (10 = normal = 1 empty line)
        int extraLines = 0;
        if (!isLast)
        {
            var nextElement = sortedTimeline[i + 1];
            var tickDistance = nextElement.Tick - element.Tick;
            extraLines = Math.Max(0, (tickDistance / 10) - 1);
        }
        
        RenderTimelineElement(element, isLast, extraLines);
    }
    
    AnsiConsole.WriteLine();
    
    // Summary
    var events = model.Timeline.OfType<EventElement>().ToList();
    var stateViews = model.Timeline.OfType<StateViewElement>().ToList();
    var actors = model.Timeline.OfType<ActorElement>().ToList();
    var commands = model.Timeline.OfType<CommandElement>().ToList();
    
    var summaryTable = new Table()
        .Border(TableBorder.Rounded)
        .AddColumn("Type")
        .AddColumn("Count")
        .AddColumn("Symbol");
    
    summaryTable.AddRow("[orange1]Events[/]", events.Count.ToString(), "[orange1]●[/]");
    summaryTable.AddRow("[green]State Views[/]", stateViews.Count.ToString(), "[green]◆[/]");
    summaryTable.AddRow("[white]Actors[/]", actors.Count.ToString(), "[white]○[/]");
    summaryTable.AddRow("[blue]Commands[/]", commands.Count.ToString(), "[blue]▶[/]");
    
    AnsiConsole.Write(summaryTable);
}

void RenderTimelineElement(TimelineElement element, bool isLast, int extraLines = 0)
{
    var line = isLast ? "↓" : "│";
    
    // Fixed column positions: E=0, V/C=2, A=4, Line=6
    var (pos, symbol, color) = element switch
    {
        EventElement => (0, "●", "orange1"),
        StateViewElement => (2, "◆", "green"),
        CommandElement => (2, "▶", "blue"),
        ActorElement => (4, "○", "white"),
        _ => (0, "?", "white")
    };
    
    // Build the prefix with proper spacing
    // Format: Symbol(pos) + padding + tick + │ + name
    var tickStr = $"@{element.Tick}";
    var tickPadded = tickStr.PadLeft(5);
    var padding = Math.Max(0, 4 - pos);
    var prefix = new string(' ', pos) + $"[{color}]{symbol}[/]" + new string(' ', padding) + $"[dim]{tickPadded} {line}[/] ";
    var detailPrefix = "           " + $"[dim]{line}[/]    ";
    
    // Main line: symbol + tick + │ + name
    AnsiConsole.Markup(prefix);
    AnsiConsole.MarkupLine($"[{color} bold]{Markup.Escape(element.Name)}[/]");
    
    // Detail lines (indented) - referenced elements in their type's color
    switch (element)
    {
        case EventElement evt:
            if (!string.IsNullOrEmpty(evt.ProducedBy))
                AnsiConsole.MarkupLine($"{detailPrefix}[dim]producedBy:[/] [blue]{Markup.Escape(evt.ProducedBy)}[/]");
            if (!string.IsNullOrEmpty(evt.ExternalSource))
                AnsiConsole.MarkupLine($"{detailPrefix}[dim]externalSource:[/] [dim]{Markup.Escape(evt.ExternalSource)}[/]");
            break;
            
        case StateViewElement sv:
            if (sv.SubscribesTo.Count > 0)
            {
                var eventNames = string.Join("[dim],[/] ", sv.SubscribesTo.Select(e => $"[orange1]{Markup.Escape(e)}[/]"));
                AnsiConsole.MarkupLine($"{detailPrefix}[dim]subscribesTo:[/] {eventNames}");
            }
            break;
            
        case ActorElement actor:
            AnsiConsole.MarkupLine($"{detailPrefix}[dim]readsView:[/] [green]{Markup.Escape(actor.ReadsView)}[/]");
            AnsiConsole.MarkupLine($"{detailPrefix}[dim]sendsCommand:[/] [blue]{Markup.Escape(actor.SendsCommand)}[/]");
            break;
            
        case CommandElement:
            // Commands have no additional details to show
            break;
    }
    
    // Empty line for spacing (except for last element)
    if (!isLast)
    {
        AnsiConsole.MarkupLine($"           [dim]{line}[/]");
        
        // Add extra lines for larger tick distances
        for (int i = 0; i < extraLines; i++)
        {
            AnsiConsole.MarkupLine($"           [dim]{line}[/]");
        }
    }
}
