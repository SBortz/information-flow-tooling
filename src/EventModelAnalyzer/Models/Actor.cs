using System.Text.Json.Serialization;

namespace EventModelAnalyzer.Models;

public record Actor(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("tick")] int Tick,
    [property: JsonPropertyName("readsView")] string ReadsView,
    [property: JsonPropertyName("sendsCommand")] string SendsCommand
) : ITimelineElement
{
    [JsonPropertyName("type")]
    public string Type => "actor";
}
