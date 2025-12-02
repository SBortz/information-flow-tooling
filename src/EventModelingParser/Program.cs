using System.Reflection;
using System.Text.Json;
using EventModelingParser.Models;
using NJsonSchema;
using Spectre.Console;
using Spectre.Console.Json;
using Spectre.Console.Rendering;

// Check for help flag or no arguments
if (args.Length == 0 || args.Contains("--help") || args.Contains("-h") || args.Contains("-?"))
{
    ShowHelp();
    return args.Length == 0 ? 1 : 0;
}

var filePath = args[0];
string viewMode = "timeline";

for (int i = 1; i < args.Length; i++)
{
    if ((args[i] == "--view" || args[i] == "-v") && i + 1 < args.Length)
    {
        viewMode = args[++i].ToLower();
    }
}

// Helper to load embedded schema
string? GetEmbeddedSchema()
{
    var assembly = Assembly.GetExecutingAssembly();
    using var stream = assembly.GetManifestResourceStream("EventModelingParser.event-modeling.schema.json");
    if (stream == null) return null;
    using var reader = new StreamReader(stream);
    return reader.ReadToEnd();
}

void ShowHelp()
{
    // Header
    AnsiConsole.WriteLine();
    var title = new FigletText("EM Parser")
        .Color(Color.Cyan1)
        .Centered();
    AnsiConsole.Write(title);
    
    AnsiConsole.Write(new Rule("[dim]Event Modeling File Format Parser & Visualizer[/]")
    {
        Justification = Justify.Center,
        Style = Style.Parse("grey")
    });
    AnsiConsole.WriteLine();
    
    // Usage
    var usagePanel = new Panel(
        new Markup("[white]EventModelingParser[/] [cyan]<file>[/] [dim][[options]][/]"))
    {
        Header = new PanelHeader("[yellow bold]Usage[/]"),
        Border = BoxBorder.Rounded,
        BorderStyle = new Style(Color.Yellow),
        Padding = new Padding(2, 0)
    };
    AnsiConsole.Write(usagePanel);
    AnsiConsole.WriteLine();
    
    // Arguments
    var argsTable = new Table()
        .Border(TableBorder.Rounded)
        .BorderColor(Color.Grey)
        .Title("[cyan bold]Arguments[/]")
        .AddColumn(new TableColumn("[cyan]Argument[/]").Width(20))
        .AddColumn(new TableColumn("[dim]Description[/]"));
    
    argsTable.AddRow(
        "[cyan]<file>[/]",
        "Path to the [yellow].eventmodel.json[/] file to parse"
    );
    
    AnsiConsole.Write(argsTable);
    AnsiConsole.WriteLine();
    
    // Options
    var optionsTable = new Table()
        .Border(TableBorder.Rounded)
        .BorderColor(Color.Grey)
        .Title("[green bold]Options[/]")
        .AddColumn(new TableColumn("[green]Option[/]").Width(25))
        .AddColumn(new TableColumn("[dim]Description[/]"));
    
    optionsTable.AddRow(
        "[green]-v[/], [green]--view[/] [dim]<mode>[/]",
        "Display mode for the event model\n" +
        "  [blue]timeline[/] - Vertical timeline view [dim](default)[/]\n" +
        "  [blue]slice[/]    - Detailed slice view with JSON examples\n" +
        "  [blue]table[/]    - Tabular overview with data flow tree"
    );
    optionsTable.AddRow(
        "[green]-h[/], [green]--help[/], [green]-?[/]",
        "Show this help message"
    );
    
    AnsiConsole.Write(optionsTable);
    AnsiConsole.WriteLine();
    
    // View Modes Detail
    var viewsTable = new Table()
        .Border(TableBorder.Rounded)
        .BorderColor(Color.Blue)
        .Title("[blue bold]View Modes[/]")
        .AddColumn(new TableColumn("[blue]Mode[/]").Width(12))
        .AddColumn(new TableColumn("[dim]Best For[/]"))
        .AddColumn(new TableColumn("[dim]Features[/]"));
    
    viewsTable.AddRow(
        "[blue bold]timeline[/]",
        "Quick overview",
        "Chronological flow, symbols by type, relationships"
    );
    viewsTable.AddRow(
        "[blue bold]slice[/]",
        "Detailed analysis",
        "JSON examples, panels, command/view details"
    );
    viewsTable.AddRow(
        "[blue bold]table[/]",
        "Documentation",
        "Tables per type, [cyan]data flow tree[/], summary cards"
    );
    
    AnsiConsole.Write(viewsTable);
    AnsiConsole.WriteLine();
    
    // Examples
    AnsiConsole.Write(new Rule("[yellow]Examples[/]") { Style = Style.Parse("yellow"), Justification = Justify.Left });
    AnsiConsole.WriteLine();
    
    AnsiConsole.MarkupLine("  [dim]# Basic usage (timeline view)[/]");
    AnsiConsole.MarkupLine("  [white]EventModelingParser[/] [cyan]my-model.eventmodel.json[/]");
    AnsiConsole.WriteLine();
    
    AnsiConsole.MarkupLine("  [dim]# Table view with data flow tree[/]");
    AnsiConsole.MarkupLine("  [white]EventModelingParser[/] [cyan]my-model.eventmodel.json[/] [green]--view table[/]");
    AnsiConsole.WriteLine();
    
    AnsiConsole.MarkupLine("  [dim]# Detailed slice view with JSON examples[/]");
    AnsiConsole.MarkupLine("  [white]EventModelingParser[/] [cyan]my-model.eventmodel.json[/] [green]-v slice[/]");
    AnsiConsole.WriteLine();
    
    // Legend
    AnsiConsole.Write(new Rule("[dim]Symbol Legend[/]") { Style = Style.Parse("grey"), Justification = Justify.Left });
    var legendGrid = new Grid()
        .AddColumn()
        .AddColumn()
        .AddColumn()
        .AddColumn();
    
    legendGrid.AddRow(
        "[orange1]● Event[/]",
        "[green]◆ State View[/]",
        "[blue]▶ Command[/]",
        "[white]○ Actor[/]"
    );
    
    AnsiConsole.Write(legendGrid);
    AnsiConsole.WriteLine();
}

if (!File.Exists(filePath))
{
    AnsiConsole.MarkupLine($"[red]Error:[/] File not found: {filePath}");
    return 1;
}

var json = await File.ReadAllTextAsync(filePath);

// Schema validation with embedded schema
var schemaJson = GetEmbeddedSchema();

if (schemaJson != null)
{
    AnsiConsole.MarkupLine("[dim]Validating against schema...[/]");
    var schema = await JsonSchema.FromJsonAsync(schemaJson);
    var errors = schema.Validate(json);

    if (errors.Count > 0)
    {
        AnsiConsole.MarkupLine($"[red]Schema validation failed with {errors.Count} error(s):[/]");
        foreach (var error in errors)
        {
            AnsiConsole.MarkupLine($"  [red]•[/] {Markup.Escape(error.Path ?? "(root)")}: {error.Kind}");
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
else if (viewMode == "table")
{
    RenderTableView(model);
}
else
{
    RenderTimeline(model);
}

return 0;

void RenderHeader(EventModel model, string? viewName = null)
{
    AnsiConsole.WriteLine();
    
    // Figlet header
    var figlet = new FigletText(model.Name)
        .Color(Color.Cyan1)
        .Centered();
    AnsiConsole.Write(figlet);
    
    // Subtitle with version and view mode
    var subtitle = new List<string>();
    if (!string.IsNullOrEmpty(model.Version))
        subtitle.Add($"v{model.Version}");
    if (viewName != null)
        subtitle.Add(viewName);
    
    if (subtitle.Count > 0)
    {
        AnsiConsole.Write(new Rule($"[dim]{string.Join(" • ", subtitle)}[/]")
        {
            Justification = Justify.Center,
            Style = Style.Parse("grey")
        });
    }
    
    if (!string.IsNullOrEmpty(model.Description))
    {
        AnsiConsole.WriteLine();
        var descPanel = new Panel(new Markup($"[italic]{Markup.Escape(model.Description)}[/]"))
        {
            Border = BoxBorder.None,
            Padding = new Padding(2, 0)
        };
        AnsiConsole.Write(descPanel);
    }
    
    AnsiConsole.WriteLine();
}

void RenderTableView(EventModel model)
{
    RenderHeader(model, "Table View");
    
    var events = model.Timeline.OfType<EventElement>().ToList();
    var stateViews = model.Timeline.OfType<StateViewElement>().ToList();
    var actors = model.Timeline.OfType<ActorElement>().ToList();
    var commands = model.Timeline.OfType<CommandElement>().ToList();
    
    // Events Table (distinct by name)
    var distinctEvents = events.GroupBy(e => e.Name).Select(g => g.First()).ToList();
    if (distinctEvents.Count > 0)
    {
        AnsiConsole.Write(new Rule("[orange1 bold]● Events[/]") { Style = Style.Parse("orange1"), Justification = Justify.Left });
        
        var eventTable = new Table()
            .Border(TableBorder.Rounded)
            .BorderColor(Color.Orange1)
            .Title("[orange1]Domain Events[/]")
            .AddColumn(new TableColumn("[orange1 bold]Name[/]"))
            .AddColumn(new TableColumn("[dim]Produced By[/]"))
            .AddColumn(new TableColumn("[dim]External Source[/]"));
        
        foreach (var evt in distinctEvents.OrderBy(e => e.Name))
        {
            // Find all commands that produce this event
            var producedByCommands = events
                .Where(e => e.Name == evt.Name && !string.IsNullOrEmpty(e.ProducedBy))
                .Select(e => e.ProducedBy!.Split('-')[0])
                .Distinct()
                .ToList();
            
            var producedBy = producedByCommands.Count > 0
                ? string.Join(", ", producedByCommands.Select(c => $"[blue]{Markup.Escape(c)}[/]"))
                : "[dim]-[/]";
            
            eventTable.AddRow(
                $"[orange1 bold]{Markup.Escape(evt.Name)}[/]",
                producedBy,
                !string.IsNullOrEmpty(evt.ExternalSource) ? Markup.Escape(evt.ExternalSource) : "[dim]-[/]"
            );
        }
        
        AnsiConsole.Write(eventTable);
        AnsiConsole.WriteLine();
    }
    
    // State Views Table (distinct by name)
    var distinctStateViews = stateViews.GroupBy(sv => sv.Name).Select(g => g.First()).ToList();
    if (distinctStateViews.Count > 0)
    {
        AnsiConsole.Write(new Rule("[green bold]◆ State Views[/]") { Style = Style.Parse("green"), Justification = Justify.Left });
        
        var viewTable = new Table()
            .Border(TableBorder.Rounded)
            .BorderColor(Color.Green)
            .Title("[green]Read Models[/]")
            .AddColumn(new TableColumn("[green bold]Name[/]"))
            .AddColumn(new TableColumn("[dim]Subscribes To[/]"));
        
        foreach (var sv in distinctStateViews.OrderBy(e => e.Name))
        {
            var subscribes = sv.SubscribesTo.Count > 0 
                ? string.Join(", ", sv.SubscribesTo.Select(e => $"[orange1]{Markup.Escape(e)}[/]"))
                : "[dim]-[/]";
            
            viewTable.AddRow(
                $"[green bold]{Markup.Escape(sv.Name)}[/]",
                subscribes
            );
        }
        
        AnsiConsole.Write(viewTable);
        AnsiConsole.WriteLine();
    }
    
    // Commands Table (distinct by name)
    var distinctCommands = commands.GroupBy(c => c.Name).Select(g => g.First()).ToList();
    if (distinctCommands.Count > 0)
    {
        AnsiConsole.Write(new Rule("[blue bold]▶ Commands[/]") { Style = Style.Parse("blue"), Justification = Justify.Left });
        
        var cmdTable = new Table()
            .Border(TableBorder.Rounded)
            .BorderColor(Color.Blue)
            .Title("[blue]Commands[/]")
            .AddColumn(new TableColumn("[blue bold]Name[/]"))
            .AddColumn(new TableColumn("[dim]Produces Events[/]"));
        
        foreach (var cmd in distinctCommands.OrderBy(e => e.Name))
        {
            // Find all events produced by commands with this name
            var producedEventNames = commands
                .Where(c => c.Name == cmd.Name)
                .SelectMany(c => events.Where(e => e.ProducedBy == $"{c.Name}-{c.Tick}"))
                .Select(e => e.Name)
                .Distinct()
                .ToList();
            
            var produces = producedEventNames.Count > 0
                ? string.Join(", ", producedEventNames.Select(e => $"[orange1]{Markup.Escape(e)}[/]"))
                : "[dim]-[/]";
            
            cmdTable.AddRow(
                $"[blue bold]{Markup.Escape(cmd.Name)}[/]",
                produces
            );
        }
        
        AnsiConsole.Write(cmdTable);
        AnsiConsole.WriteLine();
    }
    
    // Actors Table
    if (actors.Count > 0)
    {
        AnsiConsole.Write(new Rule("[white bold]○ Actors[/]") { Style = Style.Parse("white"), Justification = Justify.Left });
        
        var actorTable = new Table()
            .Border(TableBorder.Rounded)
            .BorderColor(Color.Grey)
            .Title("[white]Actors / Users[/]")
            .AddColumn(new TableColumn("[dim]Tick[/]").RightAligned())
            .AddColumn(new TableColumn("[white bold]Name[/]"))
            .AddColumn(new TableColumn("[dim]Reads View[/]"))
            .AddColumn(new TableColumn("[dim]Sends Command[/]"));
        
        foreach (var actor in actors.OrderBy(e => e.Tick))
        {
            actorTable.AddRow(
                $"[dim]@{actor.Tick}[/]",
                $"[white bold]{Markup.Escape(actor.Name)}[/]",
                $"[green]{Markup.Escape(actor.ReadsView)}[/]",
                $"[blue]{Markup.Escape(actor.SendsCommand)}[/]"
            );
        }
        
        AnsiConsole.Write(actorTable);
        AnsiConsole.WriteLine();
    }
    
    // Flow Tree - Shows the data flow
    AnsiConsole.Write(new Rule("[cyan bold]🔄 Data Flow[/]") { Style = Style.Parse("cyan"), Justification = Justify.Left });
    
    var flowTree = new Tree("[cyan]Event Model Flow[/]")
        .Style(Style.Parse("dim"));
    
    // Find commands that are triggered by actors (connected to a StateView flow)
    var commandsTriggeredByActors = actors.Select(a => a.SendsCommand).ToHashSet();
    
    // Find standalone commands (not triggered by any actor) - these are root nodes
    var standaloneCommands = commands.Where(c => !commandsTriggeredByActors.Contains(c.Name)).ToList();
    
    // Build a list of root nodes: StateViews and standalone Commands, sorted by tick
    var rootNodes = new List<(int Tick, string Type, object Element)>();
    
    foreach (var sv in stateViews)
        rootNodes.Add((sv.Tick, "StateView", sv));
    
    foreach (var cmd in standaloneCommands)
        rootNodes.Add((cmd.Tick, "Command", cmd));
    
    // Sort by tick
    rootNodes = rootNodes.OrderBy(r => r.Tick).ToList();
    
    foreach (var (tick, type, element) in rootNodes)
    {
        if (type == "StateView" && element is StateViewElement sv)
        {
            var svNode = flowTree.AddNode($"[green]◆ {Markup.Escape(sv.Name)}[/] [dim]@{sv.Tick}[/]");
            
            // Events this view subscribes to
            if (sv.SubscribesTo.Count > 0)
            {
                var subsNode = svNode.AddNode("[dim]← subscribes to[/]");
                foreach (var eventName in sv.SubscribesTo)
                {
                    subsNode.AddNode($"[orange1]● {Markup.Escape(eventName)}[/]");
                }
            }
            
            // Actors that read this view
            var readingActors = actors.Where(a => a.ReadsView == sv.Name).ToList();
            foreach (var actor in readingActors)
            {
                var actorNode = svNode.AddNode($"[white]○ {Markup.Escape(actor.Name)}[/] [dim]@{actor.Tick}[/]");
                
                // Command this actor sends
                var cmd = commands.FirstOrDefault(c => c.Name == actor.SendsCommand);
                if (cmd != null)
                {
                    var cmdNode = actorNode.AddNode($"[blue]▶ {Markup.Escape(cmd.Name)}[/] [dim]@{cmd.Tick}[/]");
                    
                    // Events produced by this command
                    var cmdKey = $"{cmd.Name}-{cmd.Tick}";
                    var producedEvents = events.Where(e => e.ProducedBy == cmdKey).ToList();
                    if (producedEvents.Count > 0)
                    {
                        var prodNode = cmdNode.AddNode("[dim]→ produces[/]");
                        foreach (var evt in producedEvents)
                        {
                            prodNode.AddNode($"[orange1]● {Markup.Escape(evt.Name)}[/] [dim]@{evt.Tick}[/]");
                        }
                    }
                }
            }
        }
        else if (type == "Command" && element is CommandElement cmd)
        {
            // Standalone command (not triggered by an actor)
            var cmdNode = flowTree.AddNode($"[blue]▶ {Markup.Escape(cmd.Name)}[/] [dim]@{cmd.Tick}[/]");
            
            // Events produced by this command
            var cmdKey = $"{cmd.Name}-{cmd.Tick}";
            var producedEvents = events.Where(e => e.ProducedBy == cmdKey).ToList();
            if (producedEvents.Count > 0)
            {
                var prodNode = cmdNode.AddNode("[dim]→ produces[/]");
                foreach (var evt in producedEvents)
                {
                    prodNode.AddNode($"[orange1]● {Markup.Escape(evt.Name)}[/] [dim]@{evt.Tick}[/]");
                }
            }
        }
    }
    
    // External events
    var externalEvents = events.Where(e => !string.IsNullOrEmpty(e.ExternalSource)).ToList();
    if (externalEvents.Count > 0)
    {
        var extNode = flowTree.AddNode("[yellow]⚡ External Events[/]");
        foreach (var evt in externalEvents)
        {
            extNode.AddNode($"[orange1]● {Markup.Escape(evt.Name)}[/] [dim]from {Markup.Escape(evt.ExternalSource!)}[/]");
        }
    }
    
    AnsiConsole.Write(flowTree);
    AnsiConsole.WriteLine();
    
    // Summary Panel
    RenderSummaryPanel(model);
}

void RenderSummaryPanel(EventModel model)
{
    var events = model.Timeline.OfType<EventElement>().Select(e => e.Name).Distinct().Count();
    var stateViews = model.Timeline.OfType<StateViewElement>().Select(sv => sv.Name).Distinct().Count();
    var actors = model.Timeline.OfType<ActorElement>().Select(a => a.Name).Distinct().Count();
    var commands = model.Timeline.OfType<CommandElement>().Select(c => c.Name).Distinct().Count();
    
    var summaryGrid = new Grid()
        .AddColumn()
        .AddColumn()
        .AddColumn()
        .AddColumn();
    
    summaryGrid.AddRow(
        new Panel($"[orange1 bold]{events}[/]\n[dim]Events[/]") { Border = BoxBorder.Rounded, BorderStyle = new Style(Color.Orange1) },
        new Panel($"[green bold]{stateViews}[/]\n[dim]Views[/]") { Border = BoxBorder.Rounded, BorderStyle = new Style(Color.Green) },
        new Panel($"[blue bold]{commands}[/]\n[dim]Commands[/]") { Border = BoxBorder.Rounded, BorderStyle = new Style(Color.Blue) },
        new Panel($"[white bold]{actors}[/]\n[dim]Actors[/]") { Border = BoxBorder.Rounded, BorderStyle = new Style(Color.Grey) }
    );
    
    AnsiConsole.Write(new Rule("[dim]Summary[/]") { Style = Style.Parse("grey") });
    AnsiConsole.Write(summaryGrid);
    AnsiConsole.WriteLine();
}

void RenderSliceView(EventModel model)
{
    RenderHeader(model, "Slice View");
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
    RenderHeader(model, "Timeline View");

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
    RenderSummaryPanel(model);
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
