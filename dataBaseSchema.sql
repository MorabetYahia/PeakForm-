CREATE TABLE "coach"(
    "coach_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "certificate" VARCHAR(200) NULL,
    "cin" VARCHAR(50) NOT NULL,
    "rating" INTEGER DEFAULT 0,
    "revenue" INTEGER DEFAULT 0   
);
ALTER TABLE
    "coach" ADD PRIMARY KEY("coach_id");
ALTER TABLE
    "coach" ADD CONSTRAINT "coach_cin_unique" UNIQUE("cin");
CREATE TABLE "client"(
    "client_id" UUID NOT NULL,
    "user_id" UUID NOT NULL
);
ALTER TABLE
    "client" ADD PRIMARY KEY("client_id");
CREATE TABLE "plan" (
    "plan_id" UUID PRIMARY KEY NOT NULL,
    "coach_id" UUID NOT NULL,
    "title" VARCHAR(50) NOT NULL,
    "objective" TEXT NOT NULL,
    "type" VARCHAR(255) NOT NULL CHECK ("type" IN ('fitness', 'nutrition', 'fitness & nutrition')),
    "price" DECIMAL(10, 2) NOT NULL,
    "description" TEXT,
    "rating" DECIMAL(3, 2),
    "status" VARCHAR(255),
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "plan_duration" INTEGER NOT NULL,
    "level" VARCHAR(50) NOT NULL CHECK ("level" IN ('beginner', 'intermediate', 'advanced')),
    CONSTRAINT "fk_coach_id" FOREIGN KEY ("coach_id") REFERENCES "coach"("coach_id") ON DELETE CASCADE
);
ALTER TABLE
    "plan" ADD PRIMARY KEY("plan_id");
CREATE INDEX "plan_coach_id_index" ON
    "plan"("coach_id");
CREATE TABLE "client_plan"(
    "client_plan_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "purchase_date" TIMESTAMP(0) WITH
        TIME zone NULL DEFAULT CURRENT_TIMESTAMP,
        "expiration_date" TIMESTAMP(0)
    WITH
        TIME zone NULL
);
ALTER TABLE
    "client_plan" ADD PRIMARY KEY("client_plan_id");

CREATE TABLE "product"(
    "product_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" INTEGER NOT NULL,
    "price" DECIMAL(10, 2) NOT NULL,
    "description" TEXT NULL,
    "image_url" VARCHAR(255) NULL,
    "stock_quantity" INTEGER NULL,
    "created_at" TIMESTAMP(0) WITH
        TIME zone NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE
    "product" ADD PRIMARY KEY("product_id");
CREATE INDEX "product_type_index" ON
    "product"("type");
CREATE INDEX "product_stock_quantity_index" ON
    "product"("stock_quantity");
CREATE TABLE "purchase_history"(
    "purchase_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "purchase_date" TIMESTAMP(0) WITH
        TIME zone NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE
    "purchase_history" ADD PRIMARY KEY("purchase_id");
CREATE TABLE "shopping_cart"(
    "cart_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "added_at" TIMESTAMP(0) WITH
        TIME zone NULL DEFAULT CURRENT_TIMESTAMP,
        "total_amount" DECIMAL(8, 2) NOT NULL
);
ALTER TABLE
    "shopping_cart" ADD PRIMARY KEY("cart_id");
COMMENT
ON COLUMN
    "shopping_cart"."total_amount" IS 'sum(product.price*cart_items.quantity)';
CREATE TABLE "orders"(
    "order_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "status" INTEGER NOT NULL,
    "shipping_address" TEXT NOT NULL,
    "created_at" TIMESTAMP(0) WITH
        TIME zone NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(0)
    WITH
        TIME zone NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE
    "orders" ADD PRIMARY KEY("order_id");
CREATE TABLE "user"(
    "user_id" UUID NOT NULL,
    "Full_name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(50) NOT NULL,
    "birthdate" DATE NOT NULL,
    "gender" VARCHAR(255) CHECK
        ("gender" IN('male', 'female')) NOT NULL,
    "phone_number" TEXT NULL,
    "profile_image" TEXT NULL,
    "address" TEXT NULL,
    "weight" FLOAT NULL,
    "height" FLOAT NULL,
        "creatad_at" TIMESTAMP(0)
    WITH
        TIME zone NULL,
        "last_login" TIMESTAMP(0)
    WITH
        TIME zone NULL
);
ALTER TABLE
    "user" ADD PRIMARY KEY("user_id");
ALTER TABLE
    "user" ADD CONSTRAINT "user_email_unique" UNIQUE("email");
CREATE TABLE "cart_items"(
    "cart_item_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "quantity" BIGINT NOT NULL
);
CREATE TABLE fitness_schedule (
    id SERIAL PRIMARY KEY,
    day INTEGER NOT NULL,
    exercise TEXT NOT NULL,
    number_of_sets INTEGER NOT NULL,
    number_of_repetition TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    coach_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    CONSTRAINT fk_coach_id FOREIGN KEY (coach_id) REFERENCES coach(coach_id) ON DELETE CASCADE,
    CONSTRAINT fk_plan_id FOREIGN KEY (plan_id) REFERENCES plan(plan_id) ON DELETE CASCADE
);
CREATE TABLE food_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    calories_per_unit INTEGER NOT NULL, -- Calories per specified unit
    unit TEXT NOT NULL -- e.g., "100g", "1 piece", "1 cup"
);
CREATE TABLE nutrition_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day INTEGER NOT NULL, -- e.g., 1=Monday, 7=Sunday
    meal_type TEXT NOT NULL, -- e.g., Breakfast, Lunch
    food_item_id UUID NOT NULL REFERENCES food_items(id),
    quantity INTEGER NOT NULL, -- how many units consumed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        coach_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    CONSTRAINT fk_coach_id FOREIGN KEY (coach_id) REFERENCES coach(coach_id) ON DELETE CASCADE,
    CONSTRAINT fk_plan_id FOREIGN KEY (plan_id) REFERENCES plan(plan_id) ON DELETE CASCADE
);
CREATE TABLE client_fitness_schedule (
    id SERIAL PRIMARY KEY,
    day INTEGER NOT NULL,
    exercise TEXT NOT NULL,
    number_of_sets INTEGER NOT NULL,
    number_of_repetition TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    coach_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    client_plan_id UUID NOT NULL,
    Progress BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_client_plan_id FOREIGN KEY (client_plan_id) REFERENCES client_plan(client_plan_id) ON DELETE CASCADE,
    CONSTRAINT fk_coach_id FOREIGN KEY (coach_id) REFERENCES coach(coach_id) ON DELETE CASCADE,
    CONSTRAINT fk_plan_id FOREIGN KEY (plan_id) REFERENCES plan(plan_id) ON DELETE CASCADE
);
CREATE TABLE client_nutrition_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day INTEGER NOT NULL, -- e.g., 1=Monday, 7=Sunday
    meal_type TEXT NOT NULL, -- e.g., Breakfast, Lunch
    food_item_id UUID NOT NULL REFERENCES food_items(id),
    quantity INTEGER NOT NULL, -- how many units consumed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    coach_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    client_plan_id UUID NOT NULL,
    CONSTRAINT fk_client_plan_id FOREIGN KEY (client_plan_id) REFERENCES client_plan(client_plan_id) ON DELETE CASCADE,
    CONSTRAINT fk_coach_id FOREIGN KEY (coach_id) REFERENCES coach(coach_id) ON DELETE CASCADE,
    CONSTRAINT fk_plan_id FOREIGN KEY (plan_id) REFERENCES plan(plan_id) ON DELETE CASCADE
);
CREATE TABLE "chat_session" (
    "chat_session_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "client_plan_id" UUID NOT NULL UNIQUE, -- Ensures 1 session per purchase
    "client_id" UUID NOT NULL,
    "coach_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("client_plan_id") REFERENCES "client_plan"("client_plan_id") ON DELETE CASCADE,
    FOREIGN KEY ("client_id") REFERENCES "client"("client_id") ON DELETE CASCADE,
    FOREIGN KEY ("coach_id") REFERENCES "coach"("coach_id") ON DELETE CASCADE,
    FOREIGN KEY ("plan_id") REFERENCES "plan"("plan_id") ON DELETE CASCADE
);
CREATE TABLE "chat_message" (
    "message_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "chat_session_id" UUID NOT NULL,
    "sender_user_id" UUID NOT NULL, -- Can be client or coach
    "message_text" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("chat_session_id") REFERENCES "chat_session"("chat_session_id") ON DELETE CASCADE,
    FOREIGN KEY ("sender_user_id") REFERENCES "user"("user_id") ON DELETE CASCADE
);
ALTER TABLE
    "cart_items" ADD PRIMARY KEY("cart_item_id");
ALTER TABLE
    "client_plan" ADD CONSTRAINT "client_plan_plan_id_foreign" FOREIGN KEY("plan_id") REFERENCES "plan"("plan_id");
ALTER TABLE
    "orders" ADD CONSTRAINT "orders_cart_id_foreign" FOREIGN KEY("cart_id") REFERENCES "shopping_cart"("cart_id");
ALTER TABLE
    "orders" ADD CONSTRAINT "orders_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "user"("user_id");
ALTER TABLE
    "plan" ADD CONSTRAINT "plan_coach_id_foreign" FOREIGN KEY("coach_id") REFERENCES "coach"("coach_id");
ALTER TABLE
    "client_plan" ADD CONSTRAINT "client_plan_client_id_foreign" FOREIGN KEY("client_id") REFERENCES "client"("client_id");
ALTER TABLE
    "cart_items" ADD CONSTRAINT "cart_items_product_id_foreign" FOREIGN KEY("product_id") REFERENCES "product"("product_id");
ALTER TABLE
    "cart_items" ADD CONSTRAINT "cart_items_cart_id_foreign" FOREIGN KEY("cart_id") REFERENCES "shopping_cart"("cart_id");
ALTER TABLE
    "shopping_cart" ADD CONSTRAINT "shopping_cart_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "user"("user_id");
ALTER TABLE
    "purchase_history" ADD CONSTRAINT "purchase_history_order_id_foreign" FOREIGN KEY("order_id") REFERENCES "orders"("order_id");
ALTER TABLE
    "purchase_history" ADD CONSTRAINT "purchase_history_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "user"("user_id");
ALTER TABLE
    "coach" ADD CONSTRAINT "coach_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "user"("user_id");
ALTER TABLE
    "client" ADD CONSTRAINT "client_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "user"("user_id");
ALTER TABLE
    "client_fitness_schedule" ADD CONSTRAINT "client_fitness_schedule_coach_id_foreign" FOREIGN KEY("coach_id") REFERENCES "coach"("coach_id");
ALTER TABLE
    "client_fitness_schedule" ADD CONSTRAINT "client_fitness_schedule_plan_id_foreign" FOREIGN KEY("plan_id") REFERENCES "plan"("plan_id");
ALTER TABLE
    "client_fitness_schedule" ADD CONSTRAINT "client_fitness_schedule_client_plan_id_foreign" FOREIGN KEY("client_plan_id") REFERENCES "client_plan"("client_plan_id");

-- Add missing foreign key constraints to nutrition_schedule
ALTER TABLE "nutrition_schedule"
ADD CONSTRAINT "fk_food_item_id" FOREIGN KEY ("food_item_id") REFERENCES "food_items"("id") ON DELETE CASCADE;

-- Add missing foreign key constraints to client_nutrition_schedule
ALTER TABLE "client_nutrition_schedule"
ADD CONSTRAINT "fk_food_item_id" FOREIGN KEY ("food_item_id") REFERENCES "food_items"("id") ON DELETE CASCADE;
    
    