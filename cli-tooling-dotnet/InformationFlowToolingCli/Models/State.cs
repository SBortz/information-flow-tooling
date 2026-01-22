using System.Text.Json.Serialization;

namespace InformationFlowToolingCli.Models;

public record State(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("tick")] int Tick,
    [property: JsonPropertyName("sourcedFrom")] List<string> SourcedFrom,
    [property: JsonPropertyName("example")] object? Example
) : ITimelineElement;
