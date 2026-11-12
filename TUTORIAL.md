# AIDGE Hardware Lab — User Guide

## English

### Start

On Windows, double-click `Start_AIDGE_Lab.cmd`. Alternatively, run `npm install` and `npm run dev`, then open the local URL in Chrome or Edge. The hardware connections require localhost or HTTPS.

### Inspect the 3D hardware

- Drag on the board to orbit; use the wheel or trackpad to zoom; click a component to read its description.
- Select **Open Immersive 3D** for a full-window view. Switch between top, bottom and assembled views, move the explode slider to separate the modeled assemblies progressively, show/hide the separate ColibryProbe, and reset the camera.
- Select a modeled part by clicking it or choosing its item in the parts list. **Disconnect part** animates that virtual part away from its mounting position; **Reconnect part** returns it. This is visual disassembly only: it does not simulate a real connector, pin state, electrical circuit, damaged component or safe power-off sequence.
- The manufacturer annotated image is shown beside the 3D and opens at full resolution. Its positions inform this illustrative model.
- The geometry is approximate and normalized. ASYGN's public pages do not provide the mechanical CAD or dimensioned drawing needed for millimetre-accurate geometry.

### Run a virtual test

Select a challenge profile, then adjust resolution, quantized model size, confidence threshold and scene density. The counters update live. **Run 20-second virtual test** runs the browser model; **Export report** downloads JSON. These outputs are planning estimates. The synthetic camera does not run an AI detector and cannot establish accuracy, latency or power on the real device.

### Connect a real telemetry source

The board does not automatically expose inference data to a web page. Firmware or a host bridge must publish one newline-terminated JSON record per processed image. For USB serial, click **Connect USB Serial**, choose the authorized port, and use 115200 baud. **Scan authorized ports** only lists ports this browser has already been allowed to access. For BLE, enter the service and notify characteristic UUIDs defined by your firmware/manual, then click **Connect BLE Device** and select the board.

Example record:

```json
{"fps":12.4,"power_mw":4.1,"latency_ms":62,"accuracy":0.96,"memory_kb":412,"count":3}
```

Fields are optional and are validated individually. Accuracy must be a fraction from 0 to 1; count must be a non-negative integer; the other numeric fields must be non-negative. Each metric card labels its own value as measured, estimated, or waiting, so an omitted field remains visibly estimated. Send accuracy as an aggregate over a labelled validation set, and send power from a calibrated analyzer; neither should be described as a per-frame inference measurement. The browser only receives access to the USB/BLE transport. When firmware or a host bridge sends valid records, those fields replace estimates. The virtual 20-second run does not trigger board inference; it opens a timed collection window for incoming readings. Build and flash an AIDGE application separately with ASYGN's toolchain and make it emit telemetry. The UI does not flash the board, invoke the proprietary NNPA, or verify that readings are genuine.

## Français

### Démarrer

Sous Windows, double-cliquez sur `Start_AIDGE_Lab.cmd`. Sinon, lancez `npm install` puis `npm run dev` et ouvrez l’adresse locale dans Chrome ou Edge. Les connexions matérielles exigent localhost ou HTTPS.

### Inspecter le matériel en 3D

- Faites glisser la souris pour orbiter, utilisez la molette ou le pavé tactile pour zoomer, puis cliquez sur un composant pour lire sa description.
- Choisissez **Ouvrir la 3D immersive** pour passer en plein écran. Basculez entre les faces supérieure, inférieure et assemblée, déplacez progressivement le curseur d’éclatement, affichez ou masquez la ColibryProbe séparée et réinitialisez la caméra.
- Sélectionnez une pièce en cliquant dessus ou depuis la liste. **Débrancher la pièce** l’éloigne visuellement de son emplacement ; **Rebrancher la pièce** la remet en place. Cette opération ne simule ni connecteur réel, ni état des broches, ni circuit électrique, ni procédure de mise hors tension sûre.
- L’image annotée du fabricant apparaît à côté de la 3D et s’ouvre en pleine résolution. Elle sert de référence de placement pour ce modèle illustratif.
- La géométrie est approximative et normalisée. Les pages publiques d’ASYGN ne fournissent pas la CAO mécanique ni le plan coté nécessaires à une précision au millimètre.

### Lancer un test virtuel

Choisissez un profil de challenge, puis réglez la résolution, la taille du modèle quantifié, le seuil de confiance et la densité de scène. Les compteurs évoluent en direct. **Lancer le test virtuel · 20 s** exécute le modèle du navigateur ; **Exporter le rapport** télécharge un JSON. Ce sont des estimations de planification. La caméra synthétique n’exécute pas de détecteur IA et ne mesure pas la précision, la latence ou la puissance de la carte réelle.

### Connecter une source de télémétrie réelle

La carte ne transmet pas automatiquement ses résultats d’inférence à une page web. Le firmware ou un pont hôte doit émettre une ligne JSON terminée par un retour à la ligne pour chaque image traitée. En USB série, cliquez sur **Connecter le port série USB**, choisissez le port autorisé et utilisez 115200 bauds. **Rechercher les ports autorisés** ne liste que les ports auxquels le navigateur a déjà accordé l’accès. En BLE, saisissez les UUID du service et de la caractéristique de notification définis par le firmware ou le manuel, puis cliquez sur **Connecter un appareil BLE** et sélectionnez la carte.

Exemple de mesure :

```json
{"fps":12.4,"power_mw":4.1,"latency_ms":62,"accuracy":0.96,"memory_kb":412,"count":3}
```

Les champs sont facultatifs et validés séparément. La précision doit être une fraction de 0 à 1 ; le comptage un entier positif ou nul ; les autres nombres doivent être positifs ou nuls. Chaque indicateur précise s’il est mesuré, estimé ou en attente : un champ absent reste clairement une estimation. Envoyez la précision agrégée sur un jeu de validation annoté et la puissance mesurée par un analyseur étalonné ; ces deux valeurs ne sont pas des mesures par image. Le navigateur accède uniquement au transport USB/BLE. Quand le firmware ou un pont hôte transmet des lignes valides, les mesures remplacent les estimations correspondantes. Le test virtuel de 20 secondes ne déclenche pas d’inférence sur la carte ; il ouvre une fenêtre de collecte des mesures entrantes. Il faut construire et programmer séparément une application AIDGE avec les outils ASYGN et lui faire émettre cette télémétrie. L’interface ne programme pas la carte, n’exécute pas le NNPA propriétaire et ne vérifie pas l’authenticité des mesures reçues.
