using System.Text.Json;
using System.Text.Json.Serialization;

namespace InformationFlowToolingCli.Models;

public class TimelineConverter : JsonConverter<List<ITimelineElement>>
{
    public override List<ITimelineElement> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var result = new List<ITimelineElement>();
        
        if (reader.TokenType != JsonTokenType.StartArray)
            throw new JsonException("Expected array start");
            
        while (reader.Read())
        {
            if (reader.TokenType == JsonTokenType.EndArray)
                return result;
                
            if (reader.TokenType != JsonTokenType.StartObject)
                throw new JsonException("Expected object start");
                
            using var doc = JsonDocument.ParseValue(ref reader);
            var root = doc.RootElement;
            
            if (!root.TryGetProperty("type", out var typeElement))
                throw new JsonException("Missing 'type' property");
                
            var type = typeElement.GetString();
            var json = root.GetRawText();
            
            ITimelineElement? element = type switch
            {
                "event" => JsonSerializer.Deserialize<Event>(json, options),
                "state" => JsonSerializer.Deserialize<State>(json, options),
                "actor" => JsonSerializer.Deserialize<Actor>(json, options),
                "command" => JsonSerializer.Deserialize<Command>(json, options),
                _ => throw new JsonException($"Unknown timeline element type: {type}")
            };
            
            if (element != null)
                result.Add(element);
        }
        
        throw new JsonException("Unexpected end of JSON");
    }

    public override void Write(Utf8JsonWriter writer, List<ITimelineElement> value, JsonSerializerOptions options)
    {
        JsonSerializer.Serialize(writer, value.Cast<object>().ToList(), options);
    }
}
