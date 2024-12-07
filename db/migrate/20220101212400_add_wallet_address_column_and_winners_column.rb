class AddWalletAddressColumnAndWinnersColumn < ActiveRecord::Migration[6.0]
  def change
    add_column :participants, :wallet_address, :string
    add_column :giveaway_participants, :winner, :boolean, default: false
  end
end
