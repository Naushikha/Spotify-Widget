// ! CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN are environment variables defined in Cloudflare

addEventListener("fetch", (event) => {
  var url = new URL(event.request.url);

  // Simple routing
  var route = url.pathname.replaceAll("/", "");
  switch (route) {
    case "hello":
      event.respondWith(handleHello(event.request));

      break;
    case "authorize":
      event.respondWith(handleAuthorization(event.request));

      break;
    case "callback":
      event.respondWith(handleCallback(event.request));

      break;
    case "get-now-playing":
      event.respondWith(handleNowPlaying(event.request));

      break;
    default:
      event.respondWith(new Response("ERROR: Unsupported request."));
  }
});

async function handleHello(request) {
  return new Response("Hello!, This is my first middleware thingy.");
}

async function handleAuthorization(request) {
  var state = "SPOTIFY_WIDGET"; // No use? remove?
  var url = new URL(request.url);
  var callback_url = `${url.protocol}//${url.hostname}/callback`;
  var scope = "user-read-private user-read-email";
  var params = {
    response_type: "code",
    client_id: CLIENT_ID,
    scope: scope,
    redirect_uri: callback_url,
    state: state,
  };
  var queryString = Object.keys(params)
    .map((key) => key + "=" + params[key])
    .join("&"); // https://howchoo.com/javascript/how-to-turn-an-object-into-query-string-parameters-in-javascript
  return Response.redirect(
    "https://accounts.spotify.com/authorize?" + queryString,
    302
  );
}

async function handleCallback(request) {
  var url = new URL(request.url);
  var callback_url = `${url.protocol}//${url.hostname}/callback`;
  var code = url.searchParams.get("code") || null;
  var state = url.searchParams.get("state") || null; // Might remove later? no use

  if (state === "SPOTIFY_WIDGET") {
    return fetch("https://accounts.spotify.com/api/token", {
      method: "post",
      headers: {
        Authorization: "Basic " + btoa(CLIENT_ID + ":" + CLIENT_SECRET),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `code=${code}&redirect_uri=${callback_url}&grant_type=authorization_code`,
    })
      .then((response) => {
        if (response.status === 200) {
          return response.json();
        } else
          return new Response("Something went wrong, retry authorization :/");
      })
      .then((data) => {
        return new Response(`Your refresh token is: ${data.refresh_token}`);
      });
  } else return new Response("Something went wrong, retry authorization :/");
}

async function handleNowPlaying(request) {
  // Get a new access token everytime :D << Easy way out (Without checking expire time)
  let response = await fetch("https://accounts.spotify.com/api/token", {
    method: "post",
    headers: {
      Authorization: "Basic " + btoa(CLIENT_ID + ":" + CLIENT_SECRET),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}`,
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
