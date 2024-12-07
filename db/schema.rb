# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `rails
# db:schema:load`. When creating a new database, `rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 2022_01_07_165745) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "giveaway_participants", force: :cascade do |t|
    t.integer "giveaway_id", null: false
    t.integer "participant_id", null: false
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.boolean "winner", default: false
    t.index ["giveaway_id", "participant_id"], name: "index_giveaway_participants_on_giveaway_id_and_participant_id", unique: true
    t.index ["participant_id"], name: "index_giveaway_participants_on_participant_id"
  end

  create_table "participants", force: :cascade do |t|
    t.bigint "discord_id", null: false
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.string "wallet_address"
    t.index ["discord_id"], name: "index_participants_on_discord_id", unique: true
  end

  create_table "smilesss_giveaways", force: :cascade do |t|
    t.string "name", null: false
    t.bigint "discord_message_id", null: false
    t.bigint "channel_id", null: false
    t.boolean "open", default: true, null: false
    t.integer "number_of_winners", null: false
    t.datetime "created_at", precision: 6, null: false
    t.datetime "updated_at", precision: 6, null: false
    t.boolean "current_giveaway", default: false, null: false
    t.index ["name"], name: "index_smilesss_giveaways_on_name", unique: true
  end

end
