// Unit tests never call the breached-password range API (16.2); the lookup has its own tests with a mocked fetch.
process.env.PASSWORD_BREACH_LOOKUP = 'off';
