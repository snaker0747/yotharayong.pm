fetch('https://docs.google.com/spreadsheets/d/1jt7vq78sOvRlb2rjAZqxhwF5YvEozrvEXPZSr9I3S-0/export?format=csv&sheet=Form%20Responses%201')
  .then(res => res.text())
  .then(text => console.log(text.substring(0, 1000)))
  .catch(err => console.error(err));
