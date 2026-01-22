using System.Text.Json.Serialization;

namespace EventModelAnalyzer.Models;

public record Command(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("tick")] int Tick,
    [property: JsonPropertyName("example")] object? Example = null
) : ITimelineElement
{
    [JsonPropertyName("type")]
    public string Type => "command";
}
