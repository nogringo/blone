import { verifyEvent } from 'nostr-tools';

export function authenticationMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header missing' });
    }

    let event;
    try {
        const encodedEvent = authHeader.split(' ')[1];
        const decodedEvent = Buffer.from(encodedEvent, 'base64').toString('utf8');
        event = JSON.parse(decodedEvent);
    } catch (error) {
        return res.status(401).json({ error: 'Bad authorization header' });
    }

    const isValideEvent = verifyEvent(event);
    if (!isValideEvent) {
        return res.status(401).json({ error: 'Bad event' });
    }

    const isKind24242 = event.kind == 24242;
    if (!isKind24242) {
        return res.status(401).json({ error: 'Event must be kind 24242' });
    }

    const now = Math.floor(Date.now() / 1000);
    const isInTheFuture = event.created_at > now;
    if (isInTheFuture) {
        return res.status(401).json({ error: 'Event must created in the past' });
    }

    req.verb = event.tags.find((tag) => tag[0] == "t")[1];

    const expiration = event.tags.find((tag) => tag[0] == "expiration")[1];
    const isExpired = expiration < now;
    if (isExpired) {
        return res.status(401).json({ error: 'Event is expired' });
    }

    req.pubkey = event.pubkey;
    req.xTags = event.tags.filter((tag) => tag[0] == "x").map((tag) => tag[1]);

    next();
}