# Credentials stay in process memory, never in the repository.
$ErrorActionPreference = 'Stop'
foreach ($taskAiName in @('ANTHROPIC_API_KEY','LIGNA_ASSISTENT_API_KEY','RACEPOINT_AI_MODEL')) {
  if (-not [Environment]::GetEnvironmentVariable($taskAiName,'Process')) {
    $taskAiValue = [Environment]::GetEnvironmentVariable($taskAiName,'User')
    if ($taskAiValue) { [Environment]::SetEnvironmentVariable($taskAiName,$taskAiValue,'Process') }
    $taskAiValue = $null
  }
}
& node (Join-Path $PSScriptRoot 'preview.mjs')
