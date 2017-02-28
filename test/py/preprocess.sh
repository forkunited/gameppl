#!/bin/bash

cd ../../src/py

for f in ../examples/games/raw/message/*.csv;
do
    fname=`basename $f`
    messageF=$f
    actionF="../inputs/raw/clickedObj/${fname}"

    python preprocess.py gameid roundNum contents "${messageF},${actionF}" "UTTERANCE,ACTION" ../examples/games/json/
done
