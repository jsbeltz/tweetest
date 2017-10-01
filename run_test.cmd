@echo off
setlocal
set path=c:\Program Files\nodejs;%path%
set exepath=%NODE_PATH%
if not defined NODE_PATH (
    echo NODE_PATH does not exist, using .\node_modules
    set exepath=.\node_modules
)
%exepath%/.bin/mocha -u tdd %*
