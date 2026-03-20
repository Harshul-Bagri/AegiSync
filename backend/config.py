from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://aegisync:aegisync@localhost:5432/aegisync"
    redis_url: str = "redis://localhost:6379"

    jwt_secret: str = "dev-secret-change-in-production"
    jwt_expiry_days: int = 7

    admin_username: str = "admin"
    admin_password: str = "change-in-production"

    dev_mode: bool = True
    simulate_outage: bool = False
    simulate_fraud: bool = False
    dev_trigger_all: bool = False  # when True: weather/AQI mocks return above-threshold values

    openweathermap_api_key: str = ""
    openaq_api_key: str = ""
    anthropic_api_key: str = ""
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
