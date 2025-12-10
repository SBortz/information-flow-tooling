using System.Text.Json.Serialization;

namespace EventModelAnalyzer.Models;

public class EventModel
{
    [JsonPropertyName("$schema")]
    public string? Schema { get; set; }
    
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("description")]
    public string? Description { get; set; }
    
    [JsonPropertyName("version")]
    public string? Version { get; set; }
    
    [JsonPropertyName("timeline")]
    public List<TimelineElement> Timeline { get; set; } = new();
}

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(EventElement), "event")]
[JsonDerivedType(typeof(StateViewElement), "stateview")]
[JsonDerivedType(typeof(ActorElement), "actor")]
[JsonDerivedType(typeof(CommandElement), "command")]
public abstract class TimelineElement
{
    [JsonPropertyName("type")]
    public abstract string Type { get; }
    
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("tick")]
    public int Tick { get; set; }
}

public class EventElement : TimelineElement
{
    public override string Type => "event";
    
    [JsonPropertyName("producedBy")]
    public string? ProducedBy { get; set; }
    
    [JsonPropertyName("externalSource")]
    public string? ExternalSource { get; set; }
    
    [JsonPropertyName("example")]
    public object? Example { get; set; }
}

public class StateViewElement : TimelineElement
{
    public override string Type => "stateview";
    
    [JsonPropertyName("subscribesTo")]
    public List<string> SubscribesTo { get; set; } = new();
    
    [JsonPropertyName("example")]
    public object? Example { get; set; }
}

public class ActorElement : TimelineElement
{
    public override string Type => "actor";
    
    [JsonPropertyName("readsView")]
    public string ReadsView { get; set; } = string.Empty;
    
    [JsonPropertyName("sendsCommand")]
    public string SendsCommand { get; set; } = string.Empty;
}

public class CommandElement : TimelineElement
{
    public override string Type => "command";
    
    [JsonPropertyName("example")]
    public object? Example { get; set; }
}

