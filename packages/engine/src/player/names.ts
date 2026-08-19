export const NAME_POOLS: Record<string, { first: string[]; last: string[] }> = {
  ES: {
    first: ["Hugo", "Mateo", "Leo", "Pablo", "Izan", "Marco", "Diego", "Alvaro"],
    last: ["Ruiz", "Serrano", "Molina", "Castro", "Ortega", "Delgado", "Vega", "Iglesias"],
  },
  FR: {
    first: ["Louis", "Hugo", "Leo", "Nathan", "Gabe", "Enzo", "Mathis", "Adam"],
    last: ["Bernard", "Petit", "Robert", "Richard", "Durand", "Moreau", "Simon", "Laurent"],
  },
  US: {
    first: ["Jaylen", "Malik", "Caleb", "Darius", "Miles", "Terrell", "Andre", "DeShawn"],
    last: ["Brooks", "Henderson", "Porter", "Reed", "Foster", "Hayes", "Bennett", "Coleman"],
  },
  RS: {
    first: ["Luka", "Marko", "Stefan", "Nikola", "Milos", "Petar", "Jovan", "Vuk"],
    last: ["Stojanovic", "Ilic", "Popovic", "Kovacevic", "Savic", "Markovic", "Jovanovic", "Nikolic"],
  },
  AR: {
    first: ["Tomas", "Facundo", "Lautaro", "Mateo", "Franco", "Agustin", "Santiago", "Thiago"],
    last: ["Romero", "Gimenez", "Acosta", "Herrera", "Silva", "Rojas", "Paz", "Medina"],
  },
  LT: {
    first: ["Domantas", "Jonas", "Linas", "Mantas", "Tadas", "Arvydas", "Rokas", "Mindaugas"],
    last: ["Kazlauskas", "Jankauskas", "Petrauskas", "Stankevicius", "Vaitkus", "Paulauskas"],
  },
  GR: {
    first: ["Nikos", "Kostas", "Dimitris", "Giorgos", "Vassilis", "Alexandros", "Panos"],
    last: ["Papadopoulos", "Nikolaou", "Georgiou", "Ioannou", "Dimitriou", "Vasileiou"],
  },
  DE: {
    first: ["Jonas", "Lukas", "Finn", "Paul", "Ben", "Noah", "Luis", "Max"],
    last: ["Schneider", "Fischer", "Weber", "Wagner", "Becker", "Hoffmann", "Schaefer"],
  },
};

export const NATIONALITIES = Object.keys(NAME_POOLS);
