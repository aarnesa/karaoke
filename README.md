# Pieni laululava

Perheen pieni, suomenkielinen karaoke tabletin tai puhelimen selaimeen.
Etusivulla on vain vanhemman valitsema kansikuvallinen laululista ja soittimessa
isot toisto-, tauko-, alusta- ja paluupainikkeet. Ei hakua eikä videosyötettä.

Sovellus: https://aarnesa.github.io/karaoke/

## Lisää tai poista laulu

Muokkaa tiedostoa [`public/songs.json`](public/songs.json) GitHubissa ja tallenna
muutos `main`-haaraan. GitHub Actions julkaisee päivityksen automaattisesti.
Lisää esimerkiksi seuraava olio listan sisään (erota oliot pilkuilla):

```json
{
  "id": "nKNoPrJsWa0",
  "title": "Tuiki tuiki tähtönen",
  "artist": "Lasten Lauluja · laula mukana"
}
```

Video-ID on YouTube-osoitteen `v=`-parametri, esimerkiksi
`https://www.youtube.com/watch?v=nKNoPrJsWa0`, tai lyhyen
`https://youtu.be/nKNoPrJsWa0`-osoitteen viimeinen osa. Käytä vain 11 merkin
tunnusta, älä koko osoitetta. Jokaisen tunnuksen pitää olla yksilöllinen.
Poista laulu poistamalla sen koko olio. Tyhjä tai virheellinen lista näyttää
virheilmoituksen eikä avaa muita videoita.

Katso video ensin itse kokonaan ja kokeile se myös sovelluksessa. Videon
omistaja voi estää upotuksen tai muuttaa saatavuutta myöhemmin. Alue-, ikä-,
tekijänoikeus- ja verkkorajoitukset voivat estää toiston. Tällöin sovellus palaa
laululistaan ja näyttää virheen. Aloituslistan videot ovat karaoke-esimerkkejä,
eivät takuu niiden tulevasta saatavuudesta tai sisällöstä. Mukana on myös
Tuiki tuiki tähtösen tavallinen laula mukana -versio (ei instrumentaalinen karaoke).
Kolmen aloitusvideon olemassaolo tarkistettiin YouTuben oEmbed-palvelusta;
se ei takaa toiston toimivan kaikilla laitteilla tai alueilla.

## Asenna kotivalikkoon

- **iPad / iPhone:** avaa osoite Safarissa → Jaa → Lisää Koti-valikkoon.
- **Android:** avaa osoite Chromessa → valikko → Asenna sovellus / Lisää aloitusnäyttöön.

Vaakatila on suositeltu. Selain ja käyttöjärjestelmä päättävät, noudatetaanko
vaakatilatoivetta. Myös pystytila toimii. Sovelluksen käyttöliittymä ja
viimeksi ladattu laululista toimivat ensimmäisen verkkokäynnin jälkeen offline-tilassa.
**Videot tarvitsevat aina verkkoyhteyden.** Päivitys tulee käyttöön, kun suljet
sovelluksen kaikki ikkunat ja avaat sen uudelleen verkkoyhteydellä.

## Rajaukset ja tabletin lukitseminen

Tämä on perheen oma käyttöliittymä, **ei YouTuben lapsiturvallisuustakuu eikä
käyttöjärjestelmätason lapsilukko**. Soitin käyttää `youtube-nocookie.com`-upotusta.
Videon päällä oleva kosketussuoja ja näppäimistökohdistuksen esto estävät suorat
painallukset upotuksen linkkeihin; lopussa ja virheessä soitin poistetaan.
`rel=0` ei poista YouTuben suosituksia kokonaan: YouTube voi näyttää esimerkiksi
mainoksia, brändäystä tai omia ilmoituksiaan. Sovellus ei pysty lupaamaan, ettei
mitään YouTuben muuta sisältöä näy. Kosketussuoja estää myös mainosten
ohituspainikkeet ja YouTuben omat säätimet; tarvittaessa palaa laululistaan.

Laulun valinta lataa YouTuben soitinohjelman. Kansikuvat tulevat YouTubesta jo
laululistaa avattaessa. YouTube saa verkkopyyntöihin liittyviä tietoja; tämä ei ole
täysin seurannaton ratkaisu. Ei omaa analytiikkaa eikä kirjautumista.

- **iOS / iPadOS:** Asetukset → Käyttöapu → Ohjattu käyttö (Guided Access).
  Aseta vanhemman pääsykoodi, avaa sovellus ja käynnistä Ohjattu käyttö
  sivu- tai Koti-painikkeen kolmella painalluksella. Rajaa tarvittaessa
  selaimen osoiterivi ja navigointi pois kosketuskäytöstä.
- **Android:** Asetukset → Suojaus / Suojaus ja tietosuoja → Sovelluksen
  kiinnitys (screen pinning). Vaadi lukituksen avaus irrottamiseen ja kiinnitä
  selain tai asennettu sovellus viimeisimpien sovellusten näkymästä.
  Valikoiden nimet vaihtelevat laitteittain.

Kokeile lukitus itse ennen kuin annat laitteen lapselle. Kiinnitys estää
sovelluksesta poistumista mutta ei yksin rajoita selaimen sisäistä navigointia.
Asennettu kotivalikkosovellus on selainnäkymää selkeämpi.

Repo ja GitHub Pages -sivu ovat **julkisia**, vaikka käyttötarkoitus on perheen
yksityinen käyttö. Laululista on kenen tahansa nähtävissä. Älä lisää lasten
nimiä, perhekuvia, tunnuksia tai muuta yksityistä tietoa.

## Kehitys

Tarvitset Node.js 22.12+ (tai tuetun uudemman LTS-version) ja npm:n.

```sh
npm ci
npm run dev
# http://127.0.0.1:5173/karaoke/
npm run build
npx playwright install chromium
npm test
```

Vite + TypeScript, ei palvelinta eikä tietokantaa. Tuotantotiedostot syntyvät
`dist`-hakemistoon. `vite.config.ts` määrittää GitHub Pagesin `/karaoke/`-polun.
Testit käyttävät paikallista YouTube-API:n testikaksoista; ne eivät varmista
oikeiden videoiden saatavuutta. Tarkista upotus oikealla laitteella.

## GitHub Pages

Valitse repossa **Settings → Pages → Source → GitHub Actions**.
Työnkulku [`.github/workflows/pages.yml`](.github/workflows/pages.yml) rakentaa,
testaa ja julkaisee `main`-haaran muutokset. HTTPS on välttämätön
service workerille ja PWA-asennukselle (paikallinen localhost toimii myös).
