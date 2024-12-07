# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rails db:seed command (or created alongside the database with db:setup).
#
# Examples:
#
#   movies = Movie.create([{ name: 'Star Wars' }, { name: 'Lord of the Rings' }])
#   Character.create(name: 'Luke', movie: movies.first)
SmilesssGiveaway.delete_all
Participant.delete_all
GiveawayParticipant.delete_all

smilesss_giveaway_1 = SmilesssGiveaway.create(name:"banana giveaway", discord_message_id: "929063215470616616", channel_id:"929063015461052417", open: true, number_of_winners: 10, current_giveaway: true)

smilesss_giveaway_2 = SmilesssGiveaway.create(name:"papaya", discord_message_id: "929063314632372234", channel_id:"929063015461052417", open: true, number_of_winners: 10, current_giveaway: true)

smilesss_giveaway_3 = SmilesssGiveaway.create(name:"pears", discord_message_id: "929063397868322907", channel_id:"929063015461052417", open: true, number_of_winners: 10, current_giveaway: true)

part_1 = Participant.create(discord_id: "438335647430868993")
part_2 = Participant.create(discord_id: "763066167534682122")
part_3 = Participant.create(discord_id: "901292407256141824")
part_4 = Participant.create(discord_id: "472852916030406666")
part_5 = Participant.create(discord_id: "890141078836092939")
part_6 = Participant.create(discord_id: "800855154043256864")
part_7 = Participant.create(discord_id: "760184828569583677")
part_8 = Participant.create(discord_id: "472073678700412938")

giveaway_participant_1 =GiveawayParticipant.create(giveaway_id: smilesss_giveaway_1.id, participant_id: part_1.id, winner: true)

giveaway_participant_2 =GiveawayParticipant.create(giveaway_id: smilesss_giveaway_1.id, participant_id: part_2.id, winner: true)
  
giveaway_participant_3 =GiveawayParticipant.create(giveaway_id: smilesss_giveaway_2.id, participant_id: part_3.id, winner: true)

giveaway_participant_4 =GiveawayParticipant.create(giveaway_id: smilesss_giveaway_2.id, participant_id: part_4.id, winner: true)

giveaway_participant_5 =GiveawayParticipant.create(giveaway_id: smilesss_giveaway_2.id, participant_id: part_5.id, winner: true)

giveaway_participant_6 =GiveawayParticipant.create(giveaway_id: smilesss_giveaway_3.id, participant_id: part_6.id, winner: true)

giveaway_participant_7 =GiveawayParticipant.create(giveaway_id: smilesss_giveaway_3.id, participant_id: part_7.id, winner: true)

# giveaway_participant_8 =GiveawayParticipant.create(giveaway_id: smilesss_giveaway_3.id, participant_id: part_8.id, winner: true)