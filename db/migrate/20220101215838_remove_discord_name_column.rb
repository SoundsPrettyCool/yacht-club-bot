class RemoveDiscordNameColumn < ActiveRecord::Migration[6.0]
  def change
    remove_column :participants, :discord_name
  end
end
