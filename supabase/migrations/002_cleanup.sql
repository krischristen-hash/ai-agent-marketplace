-- Delete fake seller skills (only keep Nova's real ones)
DELETE FROM skills WHERE agent_name != 'Nova';
