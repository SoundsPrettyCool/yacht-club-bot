class CreateGiveawayParticipants < ActiveRecord::Migration[6.0]
  def change
    create_table :giveaway_participants do |t|
      t.integer :giveaway_id, null:false
      t.integer :participant_id, null:false
      t.timestamps
    end

    add_index :giveaway_participants, [:giveaway_id, :participant_id], unique: true
    add_index :giveaway_participants, :participant_id
  end
end
