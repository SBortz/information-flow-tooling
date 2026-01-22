using System.Text.Json.Serialization;

namespace InformationFlowToolkit.Converter.Models;

/// <summary>
/// Our Information Flow file format
/// </summary>
public class InformationFlowDocument
{
    [JsonPropertyName("$schema")]
    public string Schema { get; set; } = "./information-flow.schema.json";

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("version")]
    public string Version { get; set; } = "1.0.0";

    [JsonPropertyName("timeline")]
    public List<object> Timeline { get; set; } = new();
}

public class EventTimelineElement
{
    [JsonPropertyName("type")]
    public string Type => "event";

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("tick")]
    public int Tick { get; set; }

    [JsonPropertyName("producedBy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ProducedBy { get; set; }

    [JsonPropertyName("externalSource")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ExternalSource { get; set; }

    [JsonPropertyName("example")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, object>? Example { get; set; }
}

public class StateViewTimelineElement
{
    [JsonPropertyName("type")]
    public string Type => "state";

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("tick")]
    public int Tick { get; set; }

    [JsonPropertyName("sourcedFrom")]
    public List<string> SourcedFrom { get; set; } = new();

    [JsonPropertyName("example")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, object>? Example { get; set; }
}

public class ActorTimelineElement
{
    [JsonPropertyName("type")]
    public string Type => "actor";

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("tick")]
    public int Tick { get; set; }

    [JsonPropertyName("readsView")]
    public string ReadsView { get; set; } = string.Empty;

    [JsonPropertyName("sendsCommand")]
    public string SendsCommand { get; set; } = string.Empty;
}

public class CommandTimelineElement
{
    [JsonPropertyName("type")]
    public string Type => "command";

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("tick")]
    public int Tick { get; set; }

    [JsonPropertyName("example")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, object>? Example { get; set; }
}
