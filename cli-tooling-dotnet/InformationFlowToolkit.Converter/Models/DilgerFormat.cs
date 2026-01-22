using System.Text.Json.Serialization;

namespace InformationFlowToolkit.Converter.Models;

/// <summary>
/// Root model for Dilger format
/// </summary>
public class DilgerModel
{
    [JsonPropertyName("slices")]
    public List<DilgerSlice> Slices { get; set; } = new();

    [JsonPropertyName("aggregates")]
    public List<DilgerAggregate> Aggregates { get; set; } = new();

    [JsonPropertyName("actors")]
    public List<DilgerActorDefinition> Actors { get; set; } = new();

    [JsonPropertyName("context")]
    public string? Context { get; set; }

    [JsonPropertyName("boardId")]
    public string? BoardId { get; set; }
}

public class DilgerSlice
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("index")]
    public int Index { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("sliceType")]
    public string? SliceType { get; set; }

    [JsonPropertyName("commands")]
    public List<DilgerCommand> Commands { get; set; } = new();

    [JsonPropertyName("events")]
    public List<DilgerEvent> Events { get; set; } = new();

    [JsonPropertyName("readmodels")]
    public List<DilgerReadModel> ReadModels { get; set; } = new();

    [JsonPropertyName("screens")]
    public List<DilgerScreen> Screens { get; set; } = new();

    [JsonPropertyName("processors")]
    public List<DilgerProcessor> Processors { get; set; } = new();

    [JsonPropertyName("actors")]
    public List<DilgerSliceActor> Actors { get; set; } = new();

    [JsonPropertyName("aggregates")]
    public List<string> Aggregates { get; set; } = new();
}

public class DilgerElement
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("domain")]
    public string? Domain { get; set; }

    [JsonPropertyName("aggregate")]
    public string? Aggregate { get; set; }

    [JsonPropertyName("context")]
    public string? Context { get; set; }

    [JsonPropertyName("slice")]
    public string? Slice { get; set; }

    [JsonPropertyName("fields")]
    public List<DilgerField> Fields { get; set; } = new();

    [JsonPropertyName("dependencies")]
    public List<DilgerDependency> Dependencies { get; set; } = new();
}

public class DilgerCommand : DilgerElement { }

public class DilgerEvent : DilgerElement { }

public class DilgerReadModel : DilgerElement
{
    [JsonPropertyName("listElement")]
    public bool ListElement { get; set; }
}

public class DilgerScreen : DilgerElement { }

public class DilgerProcessor : DilgerElement { }

public class DilgerField
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("example")]
    public string? Example { get; set; }

    [JsonPropertyName("optional")]
    public bool Optional { get; set; }

    [JsonPropertyName("cardinality")]
    public string? Cardinality { get; set; }

    [JsonPropertyName("mapping")]
    public string? Mapping { get; set; }

    [JsonPropertyName("idAttribute")]
    public bool IdAttribute { get; set; }
}

public class DilgerDependency
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty; // INBOUND, OUTBOUND

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("elementType")]
    public string ElementType { get; set; } = string.Empty; // EVENT, COMMAND, READMODEL, SCREEN, AUTOMATION
}

public class DilgerSliceActor
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("authzRequired")]
    public bool AuthzRequired { get; set; }
}

public class DilgerAggregate
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("service")]
    public string? Service { get; set; }
}

public class DilgerActorDefinition
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;
}
