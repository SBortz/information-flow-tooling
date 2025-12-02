using System.Text.Json;
using EventModelingParser.Models;
using NJsonSchema;
using Spectre.Console;

if (args.Length == 0)
{
    AnsiConsole.MarkupLine("[red]Usage:[/] EventModelingParser <path-to-eventmodel.json> [--schema <path-to-schema.json>]");
    return 1;
}

var filePath = args[0];
string? schemaPath = null;

for (int i = 1; i < args.Length; i++)
{
    if (args[i] == "--schema" && i + 1 < args.Length)
    {
        schemaPath = args[++i];
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
            AnsiConsole.MarkupLine($"  [red]•[/] {error.Path}: {error.Kind}");
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

// Render the timeline
RenderTimeline(model);

return 0;

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

    // Timeline table
    var table = new Table()
        .Border(TableBorder.None)
        .BorderColor(Color.Grey)
        .HideHeaders()
        .AddColumn(new TableColumn("").Centered().Width(1).NoWrap())
        .AddColumn(new TableColumn("").Centered().Width(1).NoWrap())
        .AddColumn(new TableColumn("").Centered().Width(1).NoWrap())
        .AddColumn(new TableColumn("").Centered().Width(1).NoWrap())
        .AddColumn(new TableColumn("").LeftAligned())
        .AddColumn(new TableColumn("").LeftAligned());
    
    for (int i = 0; i < model.Timeline.Count; i++)
    {
        var element = model.Timeline[i];
        var isLast = i == model.Timeline.Count - 1;
        AddTimelineRow(table, element, isLast);
    }
    
    AnsiConsole.Write(table);
    
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
    
    summaryTable.AddRow("[yellow]Events[/]", events.Count.ToString(), "[yellow]●[/]");
    summaryTable.AddRow("[blue]State Views[/]", stateViews.Count.ToString(), "[blue]◆[/]");
    summaryTable.AddRow("[green]Actors[/]", actors.Count.ToString(), "[green]○[/]");
    summaryTable.AddRow("[magenta]Commands[/]", commands.Count.ToString(), "[magenta]▶[/]");
    
    AnsiConsole.Write(summaryTable);
}

void AddTimelineRow(Table table, TimelineElement element, bool isLast)
{
    var (eventCol, viewCmdCol, actorCol, name, details) = element switch
    {
        EventElement evt => (
            "[yellow]●[/]",
            "",
            "",
            evt.Name,
            !string.IsNullOrEmpty(evt.ExternalSource) ? $"external: {evt.ExternalSource}" : ""
        ),
        StateViewElement sv => (
            "",
            "[blue]◆[/]",
            "",
            sv.Name,
            sv.SubscribesTo.Count > 0 ? $"← [{string.Join(", ", sv.SubscribesTo)}]" : ""
        ),
        CommandElement cmd => (
            "",
            "[magenta]▶[/]",
            "",
            cmd.Name,
            cmd.Produces.Count > 0 ? $"→ [{string.Join(", ", cmd.Produces)}]" : ""
        ),
        ActorElement actor => (
            "",
            "",
            "[green]○[/]",
            actor.Name,
            $"{actor.ReadsView} → {actor.SendsCommand}"
        ),
        _ => ("", "", "", element.Name, "")
    };
    
    var timelineChar = isLast ? "[dim]↓[/]" : "[dim]│[/]";
    
    table.AddRow(
        eventCol,
        viewCmdCol,
        actorCol,
        timelineChar,
        $"[bold]{Markup.Escape(name)}[/]",
        $"[dim]{Markup.Escape(details)}[/]"
    );
}
