class CreateParticipants < ActiveRecord::Migration[6.0]
  def change
    create_table :participants do |t|
      t.string :discord_name, null:false
      t.string :discord_id, null:false
      t.timestamps
    end

    add_index :participants, :discord_id, unique: true
  end
end
