class CreateSmilesssGiveaways < ActiveRecord::Migration[6.0]
  def change
    create_table :smilesss_giveaways do |t|
      t.string :name, null: false
      t.string :discord_message_id, null: false
      t.string :channel_id, null:false
      t.boolean :open, null:false, default: true
      t.integer :number_of_winners, null:false
      t.timestamps
    end

    add_index :smilesss_giveaways, :name, unique: true
  end
end
