namespace EventModelAnalyzer.Models;

public class Timeline
{
    public List<Event> Events { get; } = [];
    public List<State> StateViews { get; } = [];
    public List<Actor> Actors { get; } = [];
    public List<Command> Commands { get; } = [];
    
    public IEnumerable<ITimelineElement> All => 
        Events.Cast<ITimelineElement>()
            .Concat(StateViews)
            .Concat(Actors)
            .Concat(Commands)
            .OrderBy(e => e.Tick);
}
