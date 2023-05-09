/*!
 * Copyright (C) 2023,
 * - Kazuyuki TAKASE (https://github.com/Guvalif)
 * - Chatwork Co., Ltd. (https://github.com/chatwork)
 * 
 * This software is released under the MIT License.
 * See also: http://opensource.org/licenses/mit-license.php
 */


import assert from 'node:assert/strict';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import * as R from 'ramda';
import { Maybe } from 'purify-ts/Maybe';
import { Either, Left, Right } from 'purify-ts/Either'
import { EitherAsync } from 'purify-ts/EitherAsync';


/** @typedef {'A' | 'N2' | 'N3' | 'N4' | 'N5' | 'N6' | 'N7' | 'N8' | 'N9' | 'N10' | 'J' | 'Q' | 'K'} Card */


/** @type {Record<Card, number[]>} */
const POINT_TABLE = {
    'A'  : [ 1, 11 ],
    'N2' : [ 2 ],
    'N3' : [ 3 ],
    'N4' : [ 4 ],
    'N5' : [ 5 ],
    'N6' : [ 6 ],
    'N7' : [ 7 ],
    'N8' : [ 8 ],
    'N9' : [ 9 ],
    'N10': [ 10 ],
    'J'  : [ 10 ],
    'Q'  : [ 10 ],
    'K'  : [ 10 ],
};


/** @type {Card[]} */
const SUIT = R.flatten(R.repeat(R.keys(POINT_TABLE), 4));


/** @type {(_: Card) => number[]} */
const toPoint = R.prop(R.__, POINT_TABLE);


/** @type {(_: Card[]) => number[][]} */
const toPoints = R.map(toPoint);


/** @type {(_: number[]) => (_: number[]) => number[]} */
const addA2 = R.lift(R.add);


/** @type {(_: number[][]) => number[]} */
const calcScores = R.reduce(addA2, [ 0 ]);


/** @type {(_: number[]) => Maybe<number>} */
const extractValidScore = R.pipe(
    R.filter(R.gte(21)),
    (xs) => Math.max(...xs),
    Maybe.fromPredicate((x) => x !== - Infinity),
);


/** @type {(_: () => number) => (_: Card[]) => Card[]} */
const shuffleSuit = (random) => (suit) => {
    let shuffledSuit = R.clone(suit);

    for (let i = suit.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));

        [ shuffledSuit[i], shuffledSuit[j] ] = [ shuffledSuit[j], shuffledSuit[i] ];
    }

    return shuffledSuit;
};


/** @type {(_: Card[]) => Card[]} */
const getOddSuit = R.addIndex(R.filter)((_, i) => i % 2 !== 0);


/** @type {(_: Card[]) => Card[]} */
const getEvenSuit = R.addIndex(R.filter)((_, i) => i % 2 === 0);


/** @type {(_: Card[]) => Record<'Player' | 'Dealer', Card[]>} */
const prepareGame = R.pipe(
    shuffleSuit(Math.random),
    R.juxt([ getOddSuit, getEvenSuit ]),
    R.zipObj([ 'Player', 'Dealer' ]),
);


/** @type {(_: number) => (_: Card[]) => Maybe<number>} */
const hit = (turn) => R.pipe(
    R.take(turn + 2),
    toPoints,
    calcScores,
    extractValidScore,
);


/** @type {(_: Maybe<number>, _: string) => Either<string, string>} */
const judge = (scoreMaybe, name) => scoreMaybe.caseOf({
    Nothing : ()  => Left(`${name} Bust !`),
    Just    : (x) => (x === 21) ? Left(`${name} Black Jack !`) : Right(`${name}: ${x}`),
});


/** @typedef { import('node:readline').ReadLineOptions } IO */
/** @type {(_: IO) => EitherAsync<string, null>} */
const prompt = (io) => EitherAsync.fromPromise(async () => {
    const cli = createInterface(io);
    const result = await cli.question('Do you hit ? (Enter / Others) ');

    cli.close();

    return (result !== '') ? Left('See you !') : Right(null);
});


// Application Entry Point
// ============================================================================

const io = { input, output };
const game = prepareGame(SUIT);

/** @type {(_: number) => void} */
const main = (turn) => {
    assert.ok(turn >= 0);

    const score = R.map(hit(turn))(game);
    const result = R.mapObjIndexed(judge)(score);
    const showdown = Either.sequence(R.values(result));

    showdown.caseOf({
        Left  : ()   => {},
        Right : (xs) => console.log(`Turn ${turn} --`, xs.join(', ')),
    });

    EitherAsync.liftEither(showdown).chain(() => prompt(io)).caseOf({
        Left  : (x) => console.log(x),
        Right : ()  => main(turn + 1),
    });
};

main(0);
