import Rabbit from "@ioc:Adonis/Addons/Rabbit"
import Event from '@ioc:Adonis/Core/Event'
import Tournament from "App/DTO/Tournament"

Event.on('tournament:found', async (tournament: Tournament) => {
    try {
        await Rabbit.getConnection()
        console.log('Looking for queue')
        await Rabbit.assertExchange('ffe.tournaments', 'fanout')
        await Rabbit.assertQueue('tournaments_found')
        console.log('Queue found')
        await Rabbit.sendToQueue('tournaments_found', JSON.stringify(tournament))
        console.log('message sent to queue')
        await Rabbit.sendToExchange('ffe.tournaments', 'found', JSON.stringify(tournament))
        console.log('message sent to exchange')
    } catch (e) {
        console.error(e)
    }
})
