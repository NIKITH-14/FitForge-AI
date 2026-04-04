# Local SQLite Database Contents

You cannot read a `.db` file in VS Code without an extension because it is a **binary file format** used by the SQLite database engine. A code editor expects text, but a `.db` file contains encoded data pages as raw bytes.

**To view `.db` files directly inside VS Code in the future, you can download the "SQLite Viewer" extension.** Alternatively, for a full GUI, you can download "DB Browser for SQLite".

For now, I ran a script to read the local database directly. Here is what is inside your database right now (showing a sample of records):

## `users`
```json
[
  {
    "id": "61c24e8f-a93d-4644-b201-6b8f04d5e5d0",
    "name": "Chnadra",
    "email": "eshwarchandra17@gmail.com",
    "has_completed_intro": 0,
    "created_at": "2026-04-03 22:25:06"
  },
  {
    "id": "4b5e5c61-2f8e-48be-a160-1a07865f3842",
    "name": "Eshwar",
    "email": "b.eshwarchandra17@gmail.com",
    "has_completed_intro": 0,
    "created_at": "2026-04-03 22:26:19"
  }
]
```

## `profiles`
```json
[
  {
    "id": "43b08253-caad-40eb-9cad-975cc044bbc8",
    "user_id": "61c24e8f-a93d-4644-b201-6b8f04d5e5d0",
    "name": "Chandra",
    "avatar_emoji": "🔥",
    "height_cm": 180,
    "weight_kg": 82,
    "age": 20,
    "gender": "male",
    "fitness_goal": "aesthetic"
  },
  {
    "id": "55aa059a-4b58-49d0-889f-4d378431b329",
    "user_id": "4b5e5c61-2f8e-48be-a160-1a07865f3842",
    "name": "Rahul",
    "avatar_emoji": "💪",
    "height_cm": 190,
    "weight_kg": 90,
    "age": 20,
    "gender": "male",
    "fitness_goal": "fat_loss"
  }
]
```

## `bmi_records`
```json
[
  {
    "id": "35803841-3edf-4694-84eb-cbf23d7c1dc0",
    "bmi": 25.31,
    "category": "Overweight",
    "ideal_weight_kg": 75
  },
  {
    "id": "5a100969-a582-4f55-a51c-a1b87c617198",
    "bmi": 24.93,
    "category": "Normal",
    "ideal_weight_kg": 84
  }
]
```

## `guest_sessions`
```json
[
  {
    "id": "cdf62999-6002-4992-86a1-4d1a4685799a",
    "machine_id": "machine_test_1",
    "temp_data_json": "{}"
  }
]
```

## Empty Tables
The following tables are currently empty:
- `machine_sessions`
- `form_analyses`
- `food_logs`
- `machine_accounts`
- `ai_recommendations`
