using System.Text.Json;
using System.Reflection;
using InformationFlowToolingCli.Models;
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
string? schemaPath = null;
string? viewMode = null;
bool? showExamples = null;
string? outputFile = null;

for (int i = 1; i < args.Length; i++)
{
    if ((args[i] == "--schema" || args[i] == "-s") && i + 1 < args.Length)
    {
        schemaPath = args[++i];
    }
    else if ((args[i] == "--view" || args[i] == "-v") && i + 1 < args.Length)
    {
        viewMode = args[++i].ToLower();
    }
    else if (args[i] == "--example" || args[i] == "-e")
    {
        showExamples = true;
    }
    else if ((args[i] == "--output" || args[i] == "-o") && i + 1 < args.Length)
    {
        outputFile = args[++i];
    }
}

// Interactive prompts if options not specified
if (viewMode == null)
{
    viewMode = AnsiConsole.Prompt(
        new SelectionPrompt<string>()
            .Title("[cyan]Which view would you like?[/]")
            .PageSize(5)
            .HighlightStyle(new Style(Color.Cyan1))
            .AddChoices(new[] {
                "timeline - Vertical timeline view",
                "slice    - Detailed slice view with JSON examples", 
                "table    - Tabular overview with data flow tree"
            }))
        .Split(' ')[0]; // Extract just the view name
}

if (showExamples == null && viewMode == "timeline")
{
    showExamples = AnsiConsole.Confirm("[cyan]Show example data in timeline?[/]", false);
}

showExamples ??= false;

void ShowHelp()
{
    AnsiConsole.WriteLine();
    
    AnsiConsole.Write(new Rule("[cyan bold]Information Flow Tooling CLI[/]")
    {
        Justification = Justify.Center,
        Style = Style.Parse("grey")
    });
    AnsiConsole.WriteLine();
    
    // Usage
    var usagePanel = new Panel(
        new Markup("[white]ift[/] [cyan]<file>[/] [dim][[options]][/]"))
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
        "Path to the [yellow].informationflow.json[/] file to parse"
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
        "Display mode for the information flow model\n" +
        "  [blue]timeline[/] - Vertical timeline view [dim](default)[/]\n" +
        "  [blue]slice[/]    - Detailed slice view with JSON examples\n" +
        "  [blue]table[/]    - Tabular overview with data flow tree"
    );
    optionsTable.AddRow(
        "[green]-e[/], [green]--example[/]",
        "Show example data in timeline view"
    );
    optionsTable.AddRow(
        "[green]-o[/], [green]--output[/] [dim]<file>[/]",
        "Save output to a text file"
    );
    optionsTable.AddRow(
        "[green]-s[/], [green]--schema[/] [dim]<path>[/]",
        "Path to JSON schema file for validation"
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
    
    AnsiConsole.MarkupLine("  [dim]# Basic usage with default timeline view[/]");
    AnsiConsole.MarkupLine("  [white]ift[/] [cyan]my-model.informationflow.json[/]");
    AnsiConsole.WriteLine();
    
    AnsiConsole.MarkupLine("  [dim]# Use table view for documentation[/]");
    AnsiConsole.MarkupLine("  [white]ift[/] [cyan]my-model.informationflow.json[/] [green]--view table[/]");
    AnsiConsole.WriteLine();
    
    AnsiConsole.MarkupLine("  [dim]# Validate against schema and show slice view[/]");
    AnsiConsole.MarkupLine("  [white]ift[/] [cyan]my-model.informationflow.json[/] [green]-s schema.json -v slice[/]");
    AnsiConsole.WriteLine();
    
    AnsiConsole.MarkupLine("  [dim]# Export timeline to a text file[/]");
    AnsiConsole.MarkupLine("  [white]ift[/] [cyan]my-model.informationflow.json[/] [green]-v timeline -e -o output.txt[/]");
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
            AnsiConsole.MarkupLine($"  [red]•[/] {Markup.Escape(error.Path ?? "(root)")}: {error.Kind}");
        }
        return 1;
    }

    AnsiConsole.MarkupLine("[green]✓ Schema validation passed![/]");
    AnsiConsole.WriteLine();
}

// Parse the model
InformationFlowModel model;
try
{
    model = JsonSerializer.Deserialize<InformationFlowModel>(json) 
        ?? throw new JsonException("Failed to deserialize information flow model");
}
catch (JsonException ex)
{
    AnsiConsole.MarkupLine($"[red]Error parsing JSON:[/] {ex.Message}");
    return 1;
}

// Determine view name for header
var viewDisplayName = viewMode switch
{
    "slice" => "Slice View",
    "table" => "Table View",
    _ => "Timeline View"
};

// Always render header to console first
RenderHeader(model, viewDisplayName);

// Start recording AFTER header if output file is specified
if (outputFile != null)
{
    AnsiConsole.Record();
}

// Render based on view mode (without header since we already rendered it)
if (viewMode == "slice")
{
    RenderSliceView(model, renderHeader: false);
}
else if (viewMode == "table")
{
    RenderTableView(model, renderHeader: false);
}
else
{
    RenderTimeline(model, showExamples ?? false, renderHeader: false);
}

// Save to file if output was specified
if (outputFile != null)
{
    var text = AnsiConsole.ExportText();
    await File.WriteAllTextAsync(outputFile, text);
    AnsiConsole.MarkupLine($"\n[green]✓ Output saved to:[/] {outputFile}");
}

return 0;

void RenderHeader(InformationFlowModel model, string? viewName = null)
{
    AnsiConsole.WriteLine();
    
    // Subtitle with model name, version and view mode
    var subtitle = new List<string>();
    subtitle.Add($"[cyan]{Markup.Escape(model.Name)}[/]");
    if (!string.IsNullOrEmpty(model.Version))
        subtitle.Add($"v{model.Version}");
    if (viewName != null)
        subtitle.Add(viewName);
    
    AnsiConsole.Write(new Rule($"[dim]{string.Join(" • ", subtitle)}[/]")
    {
        Justification = Justify.Center,
        Style = Style.Parse("grey")
    });
    
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

void RenderTableView(InformationFlowModel model, bool renderHeader = true)
{
    if (renderHeader) RenderHeader(model, "Table View");
    
    var events = model.Timeline.OfType<Event>().ToList();
    var stateViews = model.Timeline.OfType<State>().ToList();
    var actors = model.Timeline.OfType<Actor>().ToList();
    var commands = model.Timeline.OfType<Command>().ToList();
    
    // Events Table
    if (events.Count > 0)
    {
        AnsiConsole.Write(new Rule("[orange1 bold]● Events[/]") { Style = Style.Parse("orange1"), Justification = Justify.Left });
        
        var eventTable = new Table()
            .Border(TableBorder.Rounded)
            .BorderColor(Color.Orange1)
            .Title("[orange1]Domain Events[/]")
            .AddColumn(new TableColumn("[dim]Tick[/]").RightAligned())
            .AddColumn(new TableColumn("[orange1 bold]Name[/]"))
            .AddColumn(new TableColumn("[dim]Produced By[/]"))
            .AddColumn(new TableColumn("[dim]External Source[/]"));
        
        foreach (var evt in events.OrderBy(e => e.Tick))
        {
            eventTable.AddRow(
                $"[dim]@{evt.Tick}[/]",
                $"[orange1 bold]{Markup.Escape(evt.Name)}[/]",
                !string.IsNullOrEmpty(evt.ProducedBy) ? $"[blue]{Markup.Escape(evt.ProducedBy)}[/]" : "[dim]-[/]",
                !string.IsNullOrEmpty(evt.ExternalSource) ? Markup.Escape(evt.ExternalSource) : "[dim]-[/]"
            );
        }
        
        AnsiConsole.Write(eventTable);
        AnsiConsole.WriteLine();
    }
    
    // State Views Table (distinct by name)
    if (stateViews.Count > 0)
    {
        AnsiConsole.Write(new Rule("[green bold]◆ State Views[/]") { Style = Style.Parse("green"), Justification = Justify.Left });
        
        var viewTable = new Table()
            .Border(TableBorder.Rounded)
            .BorderColor(Color.Green)
            .Title("[green]Read Models[/]")
            .AddColumn(new TableColumn("[green bold]Name[/]"))
            .AddColumn(new TableColumn("[dim]Subscribes To[/]"));
        
        // Group by name and merge SourcedFrom lists
        var distinctStateViews = stateViews
            .GroupBy(sv => sv.Name)
            .Select(g => new {
                Name = g.Key,
                SourcedFrom = g.SelectMany(sv => sv.SourcedFrom).Distinct().ToList()
            })
            .OrderBy(sv => sv.Name);
        
        foreach (var sv in distinctStateViews)
        {
            var subscribes = sv.SourcedFrom.Count > 0 
                ? string.Join(", ", sv.SourcedFrom.Select(e => $"[orange1]{Markup.Escape(e)}[/]"))
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
    if (commands.Count > 0)
    {
        AnsiConsole.Write(new Rule("[blue bold]▶ Commands[/]") { Style = Style.Parse("blue"), Justification = Justify.Left });
        
        var cmdTable = new Table()
            .Border(TableBorder.Rounded)
            .BorderColor(Color.Blue)
            .Title("[blue]Commands[/]")
            .AddColumn(new TableColumn("[blue bold]Name[/]"))
            .AddColumn(new TableColumn("[dim]Produces Events[/]"));
        
        // Group by name and collect all produced events
        var distinctCommands = commands
            .GroupBy(cmd => cmd.Name)
            .Select(g => new {
                Name = g.Key,
                ProducedEvents = g.SelectMany(cmd => {
                    var cmdKey = $"{cmd.Name}-{cmd.Tick}";
                    return events.Where(e => e.ProducedBy == cmdKey).Select(e => e.Name);
                }).Distinct().ToList()
            })
            .OrderBy(cmd => cmd.Name);
        
        foreach (var cmd in distinctCommands)
        {
            var produces = cmd.ProducedEvents.Count > 0
                ? string.Join(", ", cmd.ProducedEvents.Select(e => $"[orange1]{Markup.Escape(e)}[/]"))
                : "[dim]-[/]";
            
            cmdTable.AddRow(
                $"[blue bold]{Markup.Escape(cmd.Name)}[/]",
                produces
            );
        }
        
        AnsiConsole.Write(cmdTable);
        AnsiConsole.WriteLine();
    }
    
    // Actors Table (distinct by name)
    if (actors.Count > 0)
    {
        AnsiConsole.Write(new Rule("[white bold]○ Actors[/]") { Style = Style.Parse("white"), Justification = Justify.Left });
        
        var actorTable = new Table()
            .Border(TableBorder.Rounded)
            .BorderColor(Color.Grey)
            .Title("[white]Actors / Users[/]")
            .AddColumn(new TableColumn("[white bold]Name[/]"))
            .AddColumn(new TableColumn("[dim]Reads Views[/]"))
            .AddColumn(new TableColumn("[dim]Sends Commands[/]"));
        
        // Group by name and collect all views/commands
        var distinctActors = actors
            .GroupBy(a => a.Name)
            .Select(g => new {
                Name = g.Key,
                ReadsViews = g.Select(a => a.ReadsView).Distinct().ToList(),
                SendsCommands = g.Select(a => a.SendsCommand).Distinct().ToList()
            })
            .OrderBy(a => a.Name);
        
        foreach (var actor in distinctActors)
        {
            var views = string.Join(", ", actor.ReadsViews.Select(v => $"[green]{Markup.Escape(v)}[/]"));
            var cmds = string.Join(", ", actor.SendsCommands.Select(c => $"[blue]{Markup.Escape(c)}[/]"));
            
            actorTable.AddRow(
                $"[white bold]{Markup.Escape(actor.Name)}[/]",
                views,
                cmds
            );
        }
        
        AnsiConsole.Write(actorTable);
        AnsiConsole.WriteLine();
    }
    
    // Flow Tree - Shows the data flow (distinct by name)
    AnsiConsole.Write(new Rule("[cyan bold]🔄 Data Flow[/]") { Style = Style.Parse("cyan"), Justification = Justify.Left });
    
    var flowTree = new Tree("[cyan]Information Flow[/]")
        .Style(Style.Parse("dim"));
    
    // All distinct command names (shown as root nodes)
    var allCommandNames = commands
        .Select(c => c.Name)
        .Distinct()
        .ToList();
    
    // Distinct StateView names
    var distinctStateViewNames = stateViews.Select(sv => sv.Name).Distinct().OrderBy(n => n).ToList();
    
    // Build grouped data for StateViews
    var stateViewData = stateViews
        .GroupBy(sv => sv.Name)
        .ToDictionary(
            g => g.Key,
            g => g.SelectMany(sv => sv.SourcedFrom).Distinct().ToList()
        );
    
    // Build grouped data for Commands (all events produced by commands with same name)
    var commandEventData = commands
        .GroupBy(c => c.Name)
        .ToDictionary(
            g => g.Key,
            g => g.SelectMany(cmd => {
                var cmdKey = $"{cmd.Name}-{cmd.Tick}";
                return events.Where(e => e.ProducedBy == cmdKey).Select(e => e.Name);
            }).Distinct().ToList()
        );
    
    // Build grouped data for Actors
    var actorData = actors
        .GroupBy(a => a.Name)
        .ToDictionary(
            g => g.Key,
            g => new {
                ReadsViews = g.Select(a => a.ReadsView).Distinct().ToList(),
                SendsCommands = g.Select(a => a.SendsCommand).Distinct().ToList()
            }
        );
    
    // Render distinct StateViews as root nodes
    foreach (var svName in distinctStateViewNames)
    {
        var svNode = flowTree.AddNode($"[green]◆ {Markup.Escape(svName)}[/]");
        
        // Events this view sourced from
        if (stateViewData.TryGetValue(svName, out var sourcedFrom) && sourcedFrom.Count > 0)
        {
            var subsNode = svNode.AddNode("[dim]← sourced from[/]");
            foreach (var eventName in sourcedFrom.OrderBy(e => e))
            {
                subsNode.AddNode($"[orange1]● {Markup.Escape(eventName)}[/]");
            }
        }
        
        // Distinct actors that read this view
        var readingActorNames = actorData
            .Where(kv => kv.Value.ReadsViews.Contains(svName))
            .Select(kv => kv.Key)
            .OrderBy(n => n)
            .ToList();
        
        foreach (var actorName in readingActorNames)
        {
            var actorNode = svNode.AddNode($"[white]○ {Markup.Escape(actorName)}[/]");
            
            // Commands this actor sends
            var actorCommands = actorData[actorName].SendsCommands.OrderBy(c => c).ToList();
            foreach (var cmdName in actorCommands)
            {
                var cmdNode = actorNode.AddNode($"[blue]▶ {Markup.Escape(cmdName)}[/]");
                
                // Events produced by this command
                if (commandEventData.TryGetValue(cmdName, out var producedEvents) && producedEvents.Count > 0)
                {
                    var prodNode = cmdNode.AddNode("[dim]→ produces[/]");
                    foreach (var evtName in producedEvents.OrderBy(e => e))
                    {
                        prodNode.AddNode($"[orange1]● {Markup.Escape(evtName)}[/]");
                    }
                }
            }
        }
    }
    
    // Render all distinct commands as root nodes
    foreach (var cmdName in allCommandNames.OrderBy(n => n))
    {
        var cmdNode = flowTree.AddNode($"[blue]▶ {Markup.Escape(cmdName)}[/]");
        
        // Events produced by this command
        if (commandEventData.TryGetValue(cmdName, out var producedEvents) && producedEvents.Count > 0)
        {
            var prodNode = cmdNode.AddNode("[dim]→ produces[/]");
            foreach (var evtName in producedEvents.OrderBy(e => e))
            {
                prodNode.AddNode($"[orange1]● {Markup.Escape(evtName)}[/]");
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

void RenderSummaryPanel(InformationFlowModel model)
{
    var events = model.Timeline.OfType<Event>().Count();
    var stateViews = model.Timeline.OfType<State>().Count();
    var actors = model.Timeline.OfType<Actor>().Count();
    var commands = model.Timeline.OfType<Command>().Count();
    
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

void RenderSliceView(InformationFlowModel model, bool renderHeader = true)
{
    if (renderHeader) RenderHeader(model, "Slice View");
    AnsiConsole.WriteLine();
    
    // Collect all elements
    var events = model.Timeline.OfType<Event>().ToList();
    var actors = model.Timeline.OfType<Actor>().ToList();
    
    // Build lookup: which events are produced by which command (by tick)
    var eventsByCommandTick = events
        .Where(e => !string.IsNullOrEmpty(e.ProducedBy))
        .GroupBy(e => e.ProducedBy!) // Full "CommandName-Tick"
        .ToDictionary(g => g.Key, g => g.ToList());
    
    // Get slices: StateViews and Commands, sorted by tick
    var slices = model.Timeline.OfType<State>().Cast<ITimelineElement>()
        .Concat(model.Timeline.OfType<Command>())
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
            case State sv:
                title = $"[green]◆[/] {Markup.Escape(sv.Name)}";
                borderColor = Color.Green;
                symbol = "[green]◆[/]";
                
                // Events this view sourced from
                if (sv.SourcedFrom.Count > 0)
                {
                    content.Add("[dim]sourcedFrom:[/]");
                    foreach (var eventName in sv.SourcedFrom)
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
                
            case Command cmd:
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
                title = "Unknown";
                borderColor = Color.Grey;
                symbol = "?";
                break;
        }
        
        int GetSliceTick(object s) => s is ITimelineElement e ? e.Tick : 0;
        
        // Calculate extra lines based on tick distance
        int extraLines = 0;
        if (!isLast)
        {
            var nextSlice = slices[i + 1];
            var tickDistance = GetSliceTick(nextSlice) - GetSliceTick(slice);
            extraLines = Math.Max(0, (tickDistance / 10) - 1);
        }
        
        var line = isLast ? "↓" : "│";
        var tickStr = $"@{GetSliceTick(slice)}".PadLeft(5);
        
        // Timeline prefix
        AnsiConsole.MarkupLine($"{symbol} [dim]{tickStr} │[/]");
        
        // Get example data if available
        object? exampleData = slice switch
        {
            State sv => sv.Example,
            Command cmd => cmd.Example,
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

void RenderTimeline(InformationFlowModel model, bool showExamples = false, bool renderHeader = true)
{
    if (renderHeader) RenderHeader(model, "Timeline View");

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
            var tickDistance = GetTick(nextElement) - GetTick(element);
            extraLines = Math.Max(0, (tickDistance / 10) - 1);
        }
        
        RenderTimelineElement(element, isLast, extraLines, showExamples);
    }
    
    AnsiConsole.WriteLine();
    
    // Summary
    RenderSummaryPanel(model);
}

int GetTick(object element) => element is ITimelineElement e ? e.Tick : 0;

string GetName(object element) => element is ITimelineElement e ? e.Name : "";

void RenderTimelineElement(object element, bool isLast, int extraLines = 0, bool showExamples = false)
{
    var line = isLast ? "↓" : "│";
    
    // Timeline runs through the center (position 3) - through StateView/Command nodes
    // Layout: [Event col] [gap] [Timeline] [gap] [Actor col] [tick] [name]
    //         0           1     2-3        4     5           6+
    var (symbol, color) = element switch
    {
        Event => ("●", "orange1"),
        State => ("◆", "green"),
        Command => ("▶", "blue"),
        Actor => ("○", "white"),
        _ => ("?", "white")
    };
    
    var tickStr = $"@{GetTick(element)}";
    var tickPadded = tickStr.PadLeft(5);
    
    // Build the visual row with timeline running through center
    // Event (pos 0) | Timeline (pos 3) | Actor (pos 6) | tick | name
    string prefix;
    string detailPrefix;
    
    // Left margin for the entire timeline view
    const string margin = "    ";
    
    switch (element)
    {
        case Event:
            // Event is left of timeline: ●  │
            prefix = $"{margin}[{color}]{symbol}[/]  [dim]{line}[/]     {tickPadded}  ";
            detailPrefix = $"{margin}   [dim]{line}[/]            ";
            break;
            
        case State:
        case Command:
            // StateView/Command IS on the timeline (symbol replaces │)
            prefix = $"{margin}   [{color}]{symbol}[/]     {tickPadded}  ";
            detailPrefix = $"{margin}   [dim]{line}[/]            ";
            break;
            
        case Actor:
            // Actor is right of timeline: │  ○
            prefix = $"{margin}   [dim]{line}[/]  [{color}]{symbol}[/]  {tickPadded}  ";
            detailPrefix = $"{margin}   [dim]{line}[/]            ";
            break;
            
        default:
            prefix = $"{margin}   [dim]{line}[/]     {tickPadded}  ";
            detailPrefix = $"{margin}   [dim]{line}[/]            ";
            break;
    }
    
    // Main line: layout + name
    AnsiConsole.Markup(prefix);
    AnsiConsole.MarkupLine($"[{color} bold]{Markup.Escape(GetName(element))}[/]");
    
    // Detail lines (indented) - referenced elements in their type's color
    switch (element)
    {
        case Event evt:
            if (!string.IsNullOrEmpty(evt.ProducedBy))
                AnsiConsole.MarkupLine($"{detailPrefix}[dim]producedBy:[/] [blue]{Markup.Escape(evt.ProducedBy)}[/]");
            if (!string.IsNullOrEmpty(evt.ExternalSource))
                AnsiConsole.MarkupLine($"{detailPrefix}[dim]externalSource:[/] [dim]{Markup.Escape(evt.ExternalSource)}[/]");
            break;
            
        case State sv:
            if (sv.SourcedFrom.Count > 0)
            {
                var eventNames = string.Join("[dim],[/] ", sv.SourcedFrom.Select(e => $"[orange1]{Markup.Escape(e)}[/]"));
                AnsiConsole.MarkupLine($"{detailPrefix}[dim]sourcedFrom:[/] {eventNames}");
            }
            break;
            
        case Actor actor:
            AnsiConsole.MarkupLine($"{detailPrefix}[dim]readsView:[/] [green]{Markup.Escape(actor.ReadsView)}[/]");
            AnsiConsole.MarkupLine($"{detailPrefix}[dim]sendsCommand:[/] [blue]{Markup.Escape(actor.SendsCommand)}[/]");
            break;
            
        case Command:
            // Commands have no additional details to show
            break;
    }
    
    // Show example data if requested
    if (showExamples)
    {
        object? exampleData = element switch
        {
            Event evt => evt.Example,
            State sv => sv.Example,
            Command cmd => cmd.Example,
            _ => null
        };
        
        if (exampleData != null)
        {
            var exampleJson = JsonSerializer.Serialize(exampleData, new JsonSerializerOptions { WriteIndented = true });
            var jsonLines = exampleJson.Split('\n');
            foreach (var jsonLine in jsonLines)
            {
                AnsiConsole.MarkupLine($"{detailPrefix}[grey]{Markup.Escape(jsonLine)}[/]");
            }
        }
    }
    
    // Empty line for spacing (except for last element)
    if (!isLast)
    {
        AnsiConsole.MarkupLine($"{margin}   [dim]{line}[/]");
        
        // Add extra lines for larger tick distances
        for (int i = 0; i < extraLines; i++)
        {
            AnsiConsole.MarkupLine($"{margin}   [dim]{line}[/]");
        }
    }
}
