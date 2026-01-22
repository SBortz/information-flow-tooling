using System.Text.Json.Serialization;

namespace InformationFlowToolingCli.Models;

public record Event(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("tick")] int Tick,
    [property: JsonPropertyName("producedBy")] string? ProducedBy,
    [property: JsonPropertyName("externalSource")] string? ExternalSource,
    [property: JsonPropertyName("example")] object? Example
) : ITimelineElement;
