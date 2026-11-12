# AIDGE Hardware Lab — User Guide

## English

### Start

On Windows, double-click `Start_AIDGE_Lab.cmd`. Alternatively, run `npm install` and `npm run dev`, then open the local URL in Chrome or Edge. The hardware connections require localhost or HTTPS.

### Inspect the 3D hardware

- Drag on the board to orbit; use the wheel or trackpad to zoom; click a component to read its description.
- Select **Open Immersive 3D** for a full-window view. Switch between top, bottom and assembled views, move the explode slider, show/hide the separate ColibryProbe, and reset the camera.
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

Fields are optional. Accuracy is a fraction from 0 to 1. Supply actual target measurements; do not label simulator values as measured. Use a labelled validation dataset to measure accuracy and a calibrated power analyzer for board power. The UI reads telemetry; it does not flash the board, invoke the proprietary NNPA, or verify that reported readings are genuine.

## Français

### Démarrer

Sous Windows, double-cliquez sur `Start_AIDGE_Lab.cmd`. Sinon, lancez `npm install` puis `npm run dev` et ouvrez l’adresse locale dans Chrome ou Edge. Les connexions matérielles exigent localhost ou HTTPS.

### Inspecter le matériel en 3D

- Faites glisser la souris pour orbiter, utilisez la molette ou le pavé tactile pour zoomer, puis cliquez sur un composant pour lire sa description.
- Choisissez **Ouvrir la 3D immersive** pour passer en plein écran. Basculez entre les faces supérieure, inférieure et assemblée, déplacez le curseur d’éclatement, affichez ou masquez la ColibryProbe séparée et réinitialisez la caméra.
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

Les champs sont facultatifs. La précision est une fraction entre 0 et 1. Transmettez des mesures de la cible réelle et ne présentez pas les valeurs du simulateur comme des mesures. Évaluez la précision sur un jeu annoté et mesurez la puissance avec un analyseur étalonné. L’interface lit la télémétrie ; elle ne programme pas la carte, n’exécute pas le NNPA propriétaire et ne vérifie pas l’authenticité des mesures reçues.
