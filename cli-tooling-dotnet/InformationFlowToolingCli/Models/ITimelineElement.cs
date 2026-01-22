namespace InformationFlowToolingCli.Models;

public interface ITimelineElement
{
    string Type { get; }
    string Name { get; }
    int Tick { get; }
}
