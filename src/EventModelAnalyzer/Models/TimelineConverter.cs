using System.Text.Json;
using System.Text.Json.Serialization;

namespace EventModelAnalyzer.Models;

public class TimelineConverter : JsonConverter<List<ITimelineElement>>
{
    public override List<ITimelineElement> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var elements = new List<ITimelineElement>();
        
        if (reader.TokenType != JsonTokenType.StartArray)
            throw new JsonException("Expected array");
        
        while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
        {
            using var doc = JsonDocument.ParseValue(ref reader);
            var root = doc.RootElement;
            
            if (!root.TryGetProperty("type", out var typeProp))
                throw new JsonException("Missing 'type' property");
            
            var type = typeProp.GetString();
            var json = root.GetRawText();
            
            ITimelineElement element = type switch
            {
                "event" => JsonSerializer.Deserialize<Event>(json, options)!,
                "stateview" => JsonSerializer.Deserialize<State>(json, options)!,
                "actor" => JsonSerializer.Deserialize<Actor>(json, options)!,
                "command" => JsonSerializer.Deserialize<Command>(json, options)!,
                _ => throw new JsonException($"Unknown type: {type}")
            };
            
            elements.Add(element);
        }
        
        return elements;
    }

    public override void Write(Utf8JsonWriter writer, List<ITimelineElement> value, JsonSerializerOptions options)
    {
        writer.WriteStartArray();
        foreach (var item in value)
        {
            JsonSerializer.Serialize(writer, item, item.GetType(), options);
        }
        writer.WriteEndArray();
    }
}
