using System.Text.Json.Serialization;

namespace EventModelAnalyzer.Models;

public record EventModel(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("description")] string? Description = null,
    [property: JsonPropertyName("version")] string? Version = null
)
{
    [JsonPropertyName("$schema")]
    public string? Schema { get; init; }
    
    [JsonPropertyName("timeline")]
    [JsonConverter(typeof(TimelineConverter))]
    public List<ITimelineElement> Timeline { get; init; } = [];
}
