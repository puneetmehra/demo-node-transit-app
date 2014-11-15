demo-node-transit-app
=====================

(Demo) Transit app that uses NextBus API along the Google Maps JS API to store various routes for AC Transit into
a mongo DB and then allows the user to display the location of a particular stop.

The goal of this project was for me to get up to speed with a few different portions of the webstack including:
- NodeJS + Express for the backend
- Hogan JS for the templating engine
- Monk for accessing Mongodb
- Using Q for promise support to avoid "callback hell"

All the code was written in WebStorm (awesome IDE), and so the directory structure, etc is partly due to the standard
template NodeJS app that it creates.

It's the first token app I've written coming from a C++/Python background and I know there is all sorts of ugliness
that needs cleanup (eg: it's not a SPA as all the data's generated on the backend and it could really use some sort
of front-end MVC like Angular to clean that up). I also wouldn't recommend looking at the code to see best practices
as I'm a js n00b and am probably making various mistakes.

Over time if I have cycles/interest I may clean up bits and pieces, but hopefully someone else can find some of this
useful for their own web app.

========
Usage (be sure you have mongo up and running):

npm install   <— Will setup all the required modules in node_modules
bin/www   <— Starts the server

At this point you should be able to connect to localhost:3000 to get the app and assuming mongo's setup, you should
be able to add/display various AC transit routes. 