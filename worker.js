var hostname = "https://spotify.naush.workers.dev/";

addEventListener("fetch", (event) => {
  // Simple routing
  var url = event.request.url.replace(hostname, "").replaceAll("/", "");
  switch (url) {
    case "hello":
      event.respondWith(handleHello(event.request));

      break;
    case "get-now-playing":
      event.respondWith(handleNowPlaying(event.request));

      break;
    default:
      event.respondWith(new Response("ERROR: Unsupported request."));
  }
});

async function handleHello(request) {
  const data = {
    hello: "This is my first middleware thingy!",
  };
  const json = JSON.stringify(data, null, 2);
  return new Response(json, {
    headers: {
      "content-type": "application/json;charset=UTF-8",
    },
  });
}

async function handleNowPlaying(request) {
  const refresh_token = await SPOTIFY_KV.get("REFRESH_TOKEN");

  // Get a new access token everytime :D << Easy way out (Without checking expire time)
  let response = await fetch("https://accounts.spotify.com/api/token", {
    method: "post",
    headers: {
      Authorization: "Basic " + btoa(CLIENT_ID + ":" + CLIENT_SECRET),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=refresh_token&refresh_token=${refresh_token}`,
  });
  // Assuming no errors would occur :P
  response = await response.json();
  access_token = response.access_token;

  response = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    {
      headers: {
        Authorization: "Bearer " + access_token,
      },
    }
  );
  // https://mcculloughwebservices.com/2016/09/23/handling-a-null-response-from-an-api/
  // If response is empty throw error
  var responseText = await response.text();
  if (!responseText) response = { ERROR: "Couldn't retrieve now playing." };
  else response = JSON.parse(responseText);

  // Add CORS to allow requests
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Max-Age": "86400",
  };

  return new Response(JSON.stringify(response, null, 2), {
    headers: corsHeaders,
  });
}
