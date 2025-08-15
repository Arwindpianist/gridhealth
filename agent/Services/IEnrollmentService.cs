namespace GridHealth.Agent.Services;

public interface IEnrollmentService
{
    Task<bool> EnrollAsync(string token);
} 