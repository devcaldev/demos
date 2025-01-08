var ws = new WebSocket("/ws");
var currentDate;

ws.onopen = () => {
  showElement("#login");
};

ws.onerror = (ev) => {
  console.debug(ev);
  showError(new Error("websocket errored"));
};

ws.onmessage = (ev) => {
  var msg = JSON.parse(ev.data);
  if (msg.error) {
    showError(msg.error);
    return;
  }

  if (msg.id == "listEvents") {
    insertEventTableRow(msg.result);
    insertEventOccurrences(msg.result);
  } else if (msg.id == "insertEvent") {
    insertEventTableRow(msg.result);
    insertEventOccurrences(msg.result);
    $eventForm.reset();
  } else if (msg.id.startsWith("deleteEvent_")) {
    removeEventTableRow(msg.id.replace("deleteEvent_", ""));
  } else if (msg.id.startsWith("updateEvent_")) {
    replaceEventTableRow(msg.id.replace("updateEvent_", ""), $eventForm.eventData);
    // TODO: update occurrences
    $eventForm.reset();
  }
};

var $loginForm = document.querySelector("#loginForm");
$loginForm.addEventListener("submit", (ev) => {
  ev.preventDefault();

  var formData = new FormData($loginForm);
  apikey = formData.get("apikey");
  fetch("/login", { method: "POST", headers: { "x-api-key": apikey } })
    .then((r) => {
      if (r.ok) {
        sessionStorage.setItem("apikey", apikey);
        hideElement("#login");
        showElement("#main");
      } else {
        sessionStorage.deleteItem("apikey");
        showError(new Error(r.statusText));
      }
    })
    .catch(showError);
});
var apikey = sessionStorage.getItem("apikey");
if (apikey) {
  $loginForm.querySelector("[name=apikey]").value = apikey;
}

var $eventForm = document.querySelector("#eventForm");
$eventForm.querySelector("[name=dtstart]").value = new Date("1889-05-01T00:00:00.000Z")
  .toJSON()
  .substring(0, 16);
$eventForm.querySelector("[name=dtend]").value = new Date("1889-05-02T00:00:00.000Z")
  .toJSON()
  .substring(0, 16);
$eventForm.querySelector("[name=rrule]").value = "FREQ=YEARLY;INTERVAL=1;BYMONTH=5;BYMONTHDAY=1";
$eventForm.querySelector("[name=props]").value = JSON.stringify(
  {
    calendar_id: "holidays",
    event_name: "Mayday",
  },
  null,
  2
);
$eventForm.addEventListener("reset", (ev) => {
  ev.target.querySelector("h4").textContent = "New Event";
  ev.target.eventData = null;
});
$eventForm.addEventListener("submit", (ev) => {
  ev.preventDefault();

  var formData = new FormData($eventForm);
  var params = {};
  var id = formData.get("id");
  if (id) {
    params.id = id;
  }
  var dtstartStr = formData.get("dtstart");
  if (dtstartStr) {
    params.dtstart = new Date(dtstartStr);
  }
  var dtendStr = formData.get("dtend");
  if (dtendStr) {
    params.dtend = new Date(dtendStr);
  }
  var rruleStr = formData.get("rrule");
  if (rruleStr) {
    params.rrule = rruleStr;
  }
  var propsStr = formData.get("props");
  if (propsStr) {
    try {
      params.props = JSON.parse(propsStr);
    } catch (err) {
      showError(err);
      return;
    }
  }

  if (params.id) {
    Object.assign(ev.target.eventData, params);

    ws.send(
      JSON.stringify({
        id: `updateEvent_${params.id}`,
        method: "updateEvent",
        params,
      })
    );
  } else {
    ws.send(
      JSON.stringify({
        id: "insertEvent",
        method: "insertEvent",
        params,
      })
    );
  }
});

var $listEventsForm = document.querySelector("#listEventsForm");
$listEventsForm.querySelector("[name=date]").value = new Date(Date.now()).toJSON().substring(0, 10);
$listEventsForm.querySelector("[name=period]").value = "year";
$listEventsForm.addEventListener("submit", (ev) => {
  ev.preventDefault();

  var formData = new FormData($listEventsForm);
  var params = {};
  var dateStr = formData.get("date");
  var period = formData.get("period");
  if (dateStr && period) {
    params.date = new Date(dateStr);
    params.period = period;
    currentDate = params.date;
  } else {
    currentDate = null;
  }
  var propsStr = formData.get("props");
  if (propsStr) {
    try {
      params.props = JSON.parse(propsStr);
    } catch (err) {
      showError(err);
      return;
    }
  }

  $eventsTableBody.innerHTML = "";

  ws.send(
    JSON.stringify({
      id: "listEvents",
      method: "listEvents",
      params,
    })
  );
});

var $eventsTableBody = document.querySelector("#eventsTable tbody");
function eventTableRowTemplate(eventData) {
  return `
    <tr data-id="${eventData.id}">
    <td>${eventData.id}</td>
    <td>${eventData.account_id}</td>
    <td>${new Date(eventData.dtstart).toLocaleString()}</td>
    <td>${new Date(eventData.dtend).toLocaleString()}</td>
    <td>${eventData.rrule}</td>
    <td><pre>${JSON.stringify(eventData.props)}</pre></td>
    <td>${eventData.recurrenceEventId || ""}</td>
    <td>
      ${
        eventData.recurrenceEventId
          ? ""
          : `
          <button onclick='editEvent(${JSON.stringify(eventData)})'>edit</button>
          <button onclick='deleteEvent("${eventData.id}")'>delete</button>
          `
      }
    </td>
  </tr>
   `;
}
function insertEventTableRow(eventData) {
  $eventsTableBody.insertAdjacentHTML("beforeend", eventTableRowTemplate(eventData));
}
function insertEventOccurrences(eventData) {
  if (eventData.rrule) {
    var r = rrule.rrulestr(`DTSTART=${formatDateRRULE(eventData.dtstart)};${eventData.rrule}`);
    if (!currentDate) currentDate = new Date();

    var period = $listEventsForm.querySelector("[name=period]").value;
    var fromDate, toDate;
    switch (period) {
      case "day":
        fromDate = dateToRRULEDateTime(beginningOfDay(currentDate));
        toDate = dateToRRULEDateTime(endOfDay(currentDate));
        break;
      case "week":
        fromDate = dateToRRULEDateTime(beginningOfWeek(currentDate));
        toDate = dateToRRULEDateTime(endOfWeek(currentDate));
        break;
      case "month":
        fromDate = dateToRRULEDateTime(beginningOfMonth(currentDate));
        toDate = dateToRRULEDateTime(endOfMonth(currentDate));
        break;
      case "year":
        fromDate = dateToRRULEDateTime(beginningOfYear(currentDate));
        toDate = dateToRRULEDateTime(endOfYear(currentDate));
        break;
    }

    var occurences = r.between(dateToRRULEDateTime(fromDate), dateToRRULEDateTime(toDate));
    occurences.forEach((odtstart) => {
      insertEventTableRow({
        ...eventData,
        dtstart: odtstart,
        dtend: new Date(
          odtstart.getTime() + (new Date(eventData.dtend) - new Date(eventData.dtstart))
        ),
        recurrenceEventId: eventData.id,
      });
    });
  }
}
function removeEventTableRow(eventId) {
  document.querySelector(`[data-id=${eventId}]`)?.remove();
}
function replaceEventTableRow(eventId, eventData) {
  var row = document.querySelector(`[data-id=${eventId}]`);
  row.insertAdjacentHTML("afterend", eventTableRowTemplate(eventData));
  row.remove();
}

function showElement(sel) {
  document.querySelector(sel).classList.toggle("hidden", false);
}
function hideElement(sel) {
  document.querySelector(sel).classList.toggle("hidden", true);
}
function showError(err) {
  console.error(err);
  window.alert(err.message || JSON.stringify(err, null, 2));
}
function editEvent(event) {
  $eventForm.eventData = event;
  $eventForm.querySelector("h4").textContent = `Edit Event ${event.id}`;
  $eventForm.querySelector("[name=id]").value = event.id;
  $eventForm.querySelector("[name=dtstart]").value = new Date(event.dtstart)
    .toJSON()
    .substring(0, 16);
  $eventForm.querySelector("[name=dtend]").value = new Date(event.dtend).toJSON().substring(0, 16);
  $eventForm.querySelector("[name=rrule]").value = event.rrule || "";
  $eventForm.querySelector("[name=props]").value = event.props
    ? JSON.stringify(event.props, null, 2)
    : "";
}
function deleteEvent(id) {
  ws.send(
    JSON.stringify({
      id: `deleteEvent_${id}`,
      method: "deleteEvent",
      params: { id },
    })
  );
}
function formatDateRRULE(date) {
  return new Date(date).toJSON().replace(/\-|\:/g, "").split(".")[0] + "Z";
}
function dateToRRULEDateTime(d) {
  return rrule.datetime(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds()
  );
}
function beginningOfDay(s) {
  let d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(s) {
  let d = new Date(s);
  d.setHours(23, 59, 59, 999);
  return d;
}
function beginningOfWeek(s) {
  let d = new Date(s);
  let today = d.getDay();
  d.setDate(d.getDate() - ((today || 7) - 1));
  return beginningOfDay(d);
}
function endOfWeek(s) {
  let d = new Date(s);
  let today = d.getDay();
  d.setDate(d.getDate() + (7 - today));
  return endOfDay(d);
}
function beginningOfMonth(s) {
  let d = new Date(s);
  d.setDate(1);
  return beginningOfDay(d);
}
function endOfMonth(s) {
  let d = new Date(s);
  d.setDate(daysInMonth(d.getMonth(), d.getFullYear()));
  return endOfDay(d);
}
function beginningOfYear(s) {
  let d = new Date(s);
  d.setFullYear(d.getFullYear(), 0, 1);
  return beginningOfDay(d);
}
function endOfYear(s) {
  let d = new Date(s);
  d.setFullYear(d.getFullYear() + 1, 0, 0);
  return endOfDay(d);
}
function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}
