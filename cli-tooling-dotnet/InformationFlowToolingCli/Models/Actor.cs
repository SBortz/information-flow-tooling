using System.Text.Json.Serialization;

namespace InformationFlowToolingCli.Models;

public record Actor(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("tick")] int Tick,
    [property: JsonPropertyName("readsView")] string ReadsView,
    [property: JsonPropertyName("sendsCommand")] string SendsCommand
) : ITimelineElement;
