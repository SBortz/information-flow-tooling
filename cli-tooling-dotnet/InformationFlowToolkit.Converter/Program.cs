using System.Text.Json;
using System.Text.Json.Serialization;
using InformationFlowToolkit.Converter;
using InformationFlowToolkit.Converter.Models;

// Configure JSON options
var jsonReadOptions = new JsonSerializerOptions
{
    PropertyNameCaseInsensitive = true,
    ReadCommentHandling = JsonCommentHandling.Skip
};

var jsonWriteOptions = new JsonSerializerOptions
{
    WriteIndented = true,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
};

// Parse command line arguments
if (args.Length == 0)
{
    PrintUsage();
    return 1;
}

string? inputFile = null;
string? outputFile = null;
string? name = null;
bool showReport = true;

for (int i = 0; i < args.Length; i++)
{
    switch (args[i])
    {
        case "-i" or "--input":
            inputFile = args[++i];
            break;
        case "-o" or "--output":
            outputFile = args[++i];
            break;
        case "-n" or "--name":
            name = args[++i];
            break;
        case "-q" or "--quiet":
            showReport = false;
            break;
        case "-h" or "--help":
            PrintUsage();
            return 0;
        default:
            if (inputFile == null)
                inputFile = args[i];
            break;
    }
}

if (string.IsNullOrEmpty(inputFile))
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine("Error: No input file specified");
    Console.ResetColor();
    PrintUsage();
    return 1;
}

if (!File.Exists(inputFile))
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"Error: Input file not found: {inputFile}");
    Console.ResetColor();
    return 1;
}

// Default output file name
outputFile ??= Path.ChangeExtension(inputFile, ".informationflow.json");
name ??= Path.GetFileNameWithoutExtension(inputFile);

try
{
    // Read and parse input
    Console.WriteLine($"Reading: {inputFile}");
    var inputJson = await File.ReadAllTextAsync(inputFile);
    var dilgerModel = JsonSerializer.Deserialize<DilgerModel>(inputJson, jsonReadOptions);

    if (dilgerModel == null)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine("Error: Failed to parse input file");
        Console.ResetColor();
        return 1;
    }

    // Convert
    Console.WriteLine("Converting...");
    var converter = new Converter();
    var result = converter.Convert(dilgerModel, name);

    // Write output
    var outputJson = JsonSerializer.Serialize(result.Document, jsonWriteOptions);
    await File.WriteAllTextAsync(outputFile, outputJson);
    
    Console.ForegroundColor = ConsoleColor.Green;
    Console.WriteLine($"Output written to: {outputFile}");
    Console.ResetColor();

    // Print report
    if (showReport)
    {
        PrintReport(result);
    }

    return 0;
}
catch (JsonException ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"JSON Error: {ex.Message}");
    Console.ResetColor();
    return 1;
}
catch (Exception ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"Error: {ex.Message}");
    Console.ResetColor();
    return 1;
}

void PrintUsage()
{
    Console.WriteLine(@"
Information Flow Toolkit Converter - Converts various formats to Information Flow format

Usage:
  ift-converter <input-file> [options]
  ift-converter -i <input-file> -o <output-file> [options]

Supported Input Formats:
  - Dilger format (.json)

Options:
  -i, --input <file>    Input file
  -o, --output <file>   Output file (defaults to <input>.informationflow.json)
  -n, --name <name>     Name for the model (defaults to filename)
  -q, --quiet           Suppress conversion report
  -h, --help            Show this help

Examples:
  ift-converter dilger-store-example.json
  ift-converter -i input.json -o output.informationflow.json -n ""My System""
");
}

void PrintReport(ConversionResult result)
{
    Console.WriteLine();
    Console.WriteLine("╔══════════════════════════════════════════════════════════════╗");
    Console.WriteLine("║                    CONVERSION REPORT                         ║");
    Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");
    Console.WriteLine();

    // Statistics
    Console.ForegroundColor = ConsoleColor.Cyan;
    Console.WriteLine("Statistics:");
    Console.ResetColor();
    Console.WriteLine($"  Source Slices:        {result.Statistics.TotalSlices}");
    Console.WriteLine($"  Timeline Elements:    {result.Statistics.TotalTimelineElements}");
    Console.WriteLine();
    Console.WriteLine("  Converted:");
    Console.ForegroundColor = ConsoleColor.Green;
    Console.WriteLine($"    Events:             {result.Statistics.ConvertedEvents}");
    Console.WriteLine($"    Commands:           {result.Statistics.ConvertedCommands}");
    Console.WriteLine($"    StateViews:         {result.Statistics.ConvertedStateViews}");
    Console.WriteLine($"    Actors:             {result.Statistics.ConvertedActors}");
    Console.ResetColor();
    Console.WriteLine();
    Console.WriteLine("  Skipped/Transformed:");
    Console.ForegroundColor = ConsoleColor.Yellow;
    Console.WriteLine($"    Screens:            {result.Statistics.SkippedScreens}");
    Console.WriteLine($"    Processors:         {result.Statistics.SkippedProcessors}");
    Console.ResetColor();

    // Warnings
    if (result.Warnings.Count > 0)
    {
        Console.WriteLine();
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine($"Warnings ({result.Warnings.Count}):");
        Console.ResetColor();

        var groupedWarnings = result.Warnings.GroupBy(w => w.Category);
        foreach (var group in groupedWarnings)
        {
            Console.WriteLine($"\n  [{group.Key}]");
            foreach (var warning in group.Take(5))
            {
                Console.WriteLine($"    - {warning.Message}");
                if (!string.IsNullOrEmpty(warning.SourceElement))
                    Console.WriteLine($"      Source: {warning.SourceElement}");
            }
            if (group.Count() > 5)
            {
                Console.WriteLine($"    ... and {group.Count() - 5} more");
            }
        }
    }

    Console.WriteLine();
    Console.WriteLine("─────────────────────────────────────────────────────────────────");
}
