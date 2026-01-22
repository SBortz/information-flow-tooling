using System.Text.Json.Serialization;

namespace InformationFlowToolingCli.Models;

public record InformationFlowModel(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("version")] string? Version,
    [property: JsonPropertyName("timeline"), JsonConverter(typeof(TimelineConverter))] List<ITimelineElement> Timeline
);
