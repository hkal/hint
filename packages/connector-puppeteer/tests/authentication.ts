import { URL } from 'url';

import test from 'ava';
import * as sinon from 'sinon';

import { generateHTMLPage, Server } from '@hint/utils-create-server';
import { Engine, Events } from 'hint';

import Connector from '../src/connector';
import { validEvent } from './_valid-event';

const name = 'puppeteer';

test.serial(`[${name}] Form authentication on a page works`, async (t) => {
    const user = 'user';
    const password = 'password';

    const events = [
        [
            'fetch::start::target',
            { resource: 'http://localhost/' }
        ],
        [
            'fetch::start::target',
            { resource: `http://localhost/authed?user=${user}&password=${password}` }
        ],
        [
            'scan::end',
            { resource: `http://localhost/authed?user=${user}&password=${password}` }
        ]
    ];

    const engine: Engine<Events> = {
        emit(): boolean {
            return false;
        },
        async emitAsync(): Promise<any> { },
        on(): Engine {
            return null as any;
        },
        timeout: 10000
    } as any;

    const server = await Server.create({
        configuration: {
            '/': generateHTMLPage('', `
<form action="/authed" method="get">
    <input type="text" name="user" id="user">
    <input type="password" name="password" id="password">
    <input type="submit" class="submit" value="Sign in">
</form>`),
            '/authed': generateHTMLPage('', '')
        }
    });

    const engineEmitAsyncSpy = sinon.spy(engine, 'emitAsync');

    const connector = new Connector(engine, {
        auth: {
            password: {
                selector: '#password',
                value: password
            },
            submit: { selector: '.submit' },
            user: {
                selector: '#user',
                value: user
            }
        },
        detached: true
    });

    await connector.collect(new URL(`http://localhost:${server.port}/`));

    const updatedEvents = events.map((event) => {
        return Server.updateLocalhost(event, server.port);
    });
    const invokes: any[] = [];

    for (let i = 0; i < engineEmitAsyncSpy.callCount; i++) {
        invokes.push(engineEmitAsyncSpy.getCall(i).args);
    }

    updatedEvents.forEach((event) => {
        t.true(validEvent(invokes, event), `Event ${event[0]}/${event[1].resource} has the same properties`);
    });

    engineEmitAsyncSpy.restore();

    await Promise.all([connector.close(), server.stop()]);
});


test.serial(`[${name}] Authenticate on a multi-step page works`, async (t) => {
    const user = 'user';
    const password = 'password';

    const events = [
        [
            'fetch::start::target',
            { resource: 'http://localhost/' }
        ],
        [
            'fetch::start::target',
            { resource: `http://localhost/next?user=${user}` }
        ],
        [
            'fetch::start::target',
            { resource: `http://localhost/authed?password=${password}` }
        ],
        [
            'scan::end',
            { resource: `http://localhost/authed?password=${password}` }
        ]
    ];

    const engine: Engine<Events> = {
        emit(): boolean {
            return false;
        },
        async emitAsync(): Promise<any> { },
        on(): Engine {
            return null as any;
        },
        timeout: 10000
    } as any;

    const server = await Server.create({
        configuration: {
            '/': generateHTMLPage('', `
<form action="/next" method="get">
    <input type="text" name="user" id="user">
    <input type="submit" class="next" value="Next">
</form>`),
            '/authed': generateHTMLPage('', ''),
            '/next': generateHTMLPage('', `
<form action="/authed" method="get">
    <input type="password" name="password" id="password">
    <input type="submit" class="submit" value="Sign in">
</form>`)
        }
    });

    const engineEmitAsyncSpy = sinon.spy(engine, 'emitAsync');

    const connector = new Connector(engine, {
        auth: {
            next: { selector: '.next' },
            password: {
                selector: '#password',
                value: password
            },
            submit: { selector: '.submit' },
            user: {
                selector: '#user',
                value: user
            }
        },
        detached: true
    });

    await connector.collect(new URL(`http://localhost:${server.port}/`));

    const updatedEvents = events.map((event) => {
        return Server.updateLocalhost(event, server.port);
    });
    const invokes: any[] = [];

    for (let i = 0; i < engineEmitAsyncSpy.callCount; i++) {
        invokes.push(engineEmitAsyncSpy.getCall(i).args);
    }

    updatedEvents.forEach((event) => {
        t.true(validEvent(invokes, event), `Event ${event[0]}/${event[1].resource} has the same properties`);
    });

    engineEmitAsyncSpy.restore();

    await Promise.all([connector.close(), server.stop()]);
});

test.serial(`[${name}] Basic HTTP Authentication works`, async (t) => {
    const user = 'user';
    const password = 'password';

    const events = [
        [
            'fetch::start::target',
            { resource: 'http://localhost/' }
        ],
        [
            'fetch::end::html',
            { response: { statusCode: 200 } }
        ]
    ];

    const engine: Engine<Events> = {
        emit(): boolean {
            return false;
        },
        async emitAsync(): Promise<any> { },
        on(): Engine {
            return null as any;
        },
        timeout: 10000
    } as any;

    const server = await Server.create({
        configuration: {
            '/': {
                auth: `Basic ${Buffer.from(`${user}:${password}`, 'utf-8').toString('base64')}`,
                content: generateHTMLPage('', 'Success!')
            }
        }
    });

    const engineEmitAsyncSpy = sinon.spy(engine, 'emitAsync');

    const connector = new Connector(engine, {
        auth: {
            password,
            user
        },
        detached: true
    });

    await connector.collect(new URL(`http://localhost:${server.port}/`));

    const updatedEvents = events.map((event) => {
        return Server.updateLocalhost(event, server.port);
    });
    const invokes: any[] = [];

    for (let i = 0; i < engineEmitAsyncSpy.callCount; i++) {
        invokes.push(engineEmitAsyncSpy.getCall(i).args);
    }

    updatedEvents.forEach((event) => {
        t.true(validEvent(invokes, event), `Event ${event[0]}/${event[1].resource} has the same properties`);
    });

    engineEmitAsyncSpy.restore();

    await Promise.all([connector.close(), server.stop()]);
});
