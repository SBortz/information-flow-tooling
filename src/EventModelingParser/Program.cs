using System.Text.Json;
using EventModelingParser.Models;
using NJsonSchema;

if (args.Length == 0)
{
    Console.WriteLine("Usage: EventModelingParser <path-to-eventmodel.json> [--schema <path-to-schema.json>]");
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
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"Error: File not found: {filePath}");
    Console.ResetColor();
    return 1;
}

var json = await File.ReadAllTextAsync(filePath);

// Schema validation
if (schemaPath != null)
{
    if (!File.Exists(schemaPath))
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"Error: Schema file not found: {schemaPath}");
        Console.ResetColor();
        return 1;
    }

    Console.WriteLine("Validating against schema...");
    var schemaJson = await File.ReadAllTextAsync(schemaPath);
    var schema = await JsonSchema.FromJsonAsync(schemaJson);
    var errors = schema.Validate(json);

    if (errors.Count > 0)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"Schema validation failed with {errors.Count} error(s):");
        foreach (var error in errors)
        {
            Console.WriteLine($"  - {error.Path}: {error.Kind}");
        }
        Console.ResetColor();
        return 1;
    }

    Console.ForegroundColor = ConsoleColor.Green;
    Console.WriteLine("Schema validation passed!");
    Console.ResetColor();
    Console.WriteLine();
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
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"Error parsing JSON: {ex.Message}");
    Console.ResetColor();
    return 1;
}

// Output header
Console.ForegroundColor = ConsoleColor.Cyan;
Console.WriteLine("╔══════════════════════════════════════════════════════════════╗");
Console.WriteLine($"║  {model.Name,-60}║");
if (!string.IsNullOrEmpty(model.Version))
    Console.WriteLine($"║  Version: {model.Version,-52}║");
Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");
Console.ResetColor();

if (!string.IsNullOrEmpty(model.Description))
{
    Console.WriteLine();
    Console.WriteLine(model.Description);
}

Console.WriteLine();
Console.WriteLine($"Timeline ({model.Timeline.Count} elements):");
Console.WriteLine("─────────────────────────────────────────────────────────────────");

// Output timeline elements
int index = 0;
foreach (var element in model.Timeline)
{
    index++;
    PrintTimelineElement(element, index);
}

Console.WriteLine("─────────────────────────────────────────────────────────────────");
Console.WriteLine();

// Summary
var events = model.Timeline.OfType<EventElement>().ToList();
var stateViews = model.Timeline.OfType<StateViewElement>().ToList();
var actors = model.Timeline.OfType<ActorElement>().ToList();
var commands = model.Timeline.OfType<CommandElement>().ToList();

Console.WriteLine("Summary:");
Console.WriteLine($"  Events:      {events.Count}");
Console.WriteLine($"  State Views: {stateViews.Count}");
Console.WriteLine($"  Actors:      {actors.Count}");
Console.WriteLine($"  Commands:    {commands.Count}");

return 0;

void PrintTimelineElement(TimelineElement element, int index)
{
    var (color, symbol) = element switch
    {
        EventElement => (ConsoleColor.Yellow, "⚡"),
        StateViewElement => (ConsoleColor.Blue, "📋"),
        ActorElement => (ConsoleColor.Green, "👤"),
        CommandElement => (ConsoleColor.Magenta, "▶"),
        _ => (ConsoleColor.White, "?")
    };

    Console.ForegroundColor = color;
    Console.Write($"  {index,2}. [{element.Type,-7}] ");
    Console.ResetColor();
    Console.ForegroundColor = ConsoleColor.White;
    Console.Write($"{symbol} {element.Name}");
    Console.ResetColor();

    switch (element)
    {
        case EventElement evt when !string.IsNullOrEmpty(evt.ExternalSource):
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.Write($" (external: {evt.ExternalSource})");
            Console.ResetColor();
            break;
            
        case StateViewElement stateView when stateView.SubscribesTo.Count > 0:
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.Write($" ← [{string.Join(", ", stateView.SubscribesTo)}]");
            Console.ResetColor();
            break;
            
        case ActorElement actor:
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.Write($" ({actor.ReadsView} → {actor.SendsCommand})");
            Console.ResetColor();
            break;
            
        case CommandElement cmd when cmd.Produces.Count > 0:
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.Write($" → [{string.Join(", ", cmd.Produces)}]");
            Console.ResetColor();
            break;
    }

    Console.WriteLine();
}

