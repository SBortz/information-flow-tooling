using System.Text.Json.Serialization;

namespace InformationFlowToolingCli.Models;

public record Command(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("tick")] int Tick,
    [property: JsonPropertyName("example")] object? Example
) : ITimelineElement;
