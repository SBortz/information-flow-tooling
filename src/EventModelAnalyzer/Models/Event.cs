using System.Text.Json.Serialization;

namespace EventModelAnalyzer.Models;

public record Event(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("tick")] int Tick,
    [property: JsonPropertyName("producedBy")] string? ProducedBy = null,
    [property: JsonPropertyName("externalSource")] string? ExternalSource = null,
    [property: JsonPropertyName("example")] object? Example = null
) : ITimelineElement
{
    [JsonPropertyName("type")]
    public string Type => "event";
}
