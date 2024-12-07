class AddCurrentGiveawayColumnToGiveawayParticipants < ActiveRecord::Migration[6.0]
  def change
    add_column :smilesss_giveaways, :current_giveaway, :boolean, default: false, null:false
  end
end
