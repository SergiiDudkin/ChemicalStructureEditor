# Description

This is yet another molecule editor. It is platform-independent, and runs in a web browser. The project is focused on 
convenient drawing of publication quality structures, paying great attention to aesthetics. A nice looking structure 
is achieved by the comprehensive logic behind atom and bond auto positioning, alignments and shape computations.

![App, general view](CSE.png)

# Run
The app is hosted on GitHub pages: [CSE](https://sergiidudkin.github.io/ChemicalStructureEditor/).
Alternatively, clone the repository, or download it as archive and unzip. After that run the `index.html` file in your 
__Google Chrome Browser__.

# ![Selection menu](assets/images/transforms.png) Selection dropdown menu 
The menu contains a set of tools to select whole molecules or their specific parts. Every selection is marked with blue
outline, augmented with the transform tool:

![Lasso button](assets/images/transform_tool.png)

The selection can be moved to any direction. Just click on the selection, drag and drop. If the selection is pulled by
some atom (i.e. the cursor is over the atom) while the __Shift__ key is pressed, gets sticky, and can be merged with 
another, static atom. In other words, two molecules can be merged. If the static and dragged atoms have different 
symbol, the static atom or group has precedence.

## Transform tool
The transform tool consists of the circle, 8 corner squares, 8 side rectangles, and the cross-like pivot (see the 
[figure](assets/images/transform_tool.png) above).

### Rotating
Click on the circle, drag and drop. The selection will follow the direction of the cursor. If the __Shift__ key is 
pressed, the rotation angle is forced to be discrete with 5 ° resolution.

### Scaling
Click on any corner square, drag and drop. Approaching the pivot results in scale-down, and vice versa. If the __Shift__ 
key is pressed, the scaling coefficient is forced to be discrete with 5 % resolution.

### Stretching
Click on vertical or horizontal side rectangle (vertical or horizontal stretching respectively), drag and drop. 
Approaching the pivot leads compression, and vice versa. If the __Shift__ 
key is pressed, the stretching coefficient is forced to be discrete with 5 % resolution.

### Pivot
The pivot defines the point of space that stays steady during any transform except translation. To move the pivot, click 
on it, drag and drop. If the __Shift__ key is pressed, the pivot sticks to atoms and bonds, so the transform operation 
can be executed precisely around the certain element.

## Hotkeys
* Copy: `Ctrl + C`
* Paste: `Ctrl + V`
* Cut: `Ctrl + X`
* Delete: `Ctrl + Del` or `Ctrl + Bksp`

## ![Rectangle button](assets/images/select_rect.png) Rectangle 
The tool selects atoms and bonds within a rectangular area. To specify this area, click on mouse left button, drag and 
drop. Clicking on atom or bond allows dragging and dropping only this element without selecting it.

## ![Lasso button](assets/images/select_lasso.png) Lasso
The tool selects atoms and bonds within an arbitrary shaped area. To specify this area, click on mouse left button, lead 
around and drop. Clicking on atom or bond allows dragging and dropping only this element without selecting it.

## ![Molecule button](assets/images/select_mol.png) Molecule
The tool selects the entire molecule. Just click on any atom or bond of the molecule.

# ![Atom menu](assets/images/atom.png) Atom dropdown menu 
The atom menu contains the five most frequently used elements:

![Atom menu](assets/images/C.png)
![Atom menu](assets/images/H.png) 
![Atom menu](assets/images/O.png) 
![Atom menu](assets/images/N.png) 
![Atom menu](assets/images/S.png)

In general, clicking some atoms leads to setting the corresponding chemical element, augmented by hydrogens to fill up 
the remaining valencies. If the same element is already set,
then it turns into implicit carbon (no chemical symbol, and no adjacent hydrogens displayed). If any atom or group
is clicked, and 
the cursor is dragged, the atom symbol is not changed. Instead, an extra group is appended, e.g. SH, H, CH<sub>3</sub>.

If blank space is clicked,
it sets the corresponding hydride, e.g. CH<sub>4</sub>, NH<sub>3</sub>. Clicking on blank space and dragging attaches
the second group to the first one, so the molecules like H<sub>2</sub>O<sub>2</sub> and N<sub>2</sub>H<sub>4</sub> can
be drawn in one go. If a standalone chemical group is clicked with the corresponding tool (for example, you selected 
__N__ tool, and clicked on NH<sub>3</sub>), the chemical bond will be deleted.

# ![Bond menu](assets/images/bond.png) Bond dropdown menu 

## ![Single bond button](assets/images/single_bond.png) Single bond 
The single bond tool is used to build the basic carbon sceleton. Click on the blank space or some atom, and drag the 
bond to desired direction. If the cursor eventually hits another atom regardless how far it is, the bond end will stick 
to it. Repeatedly clicking on the existing bond leads to the following bond type circulation:

single bond ⮕ double bond ⮕ triple bond ⮕ single bond

## ![Double bond button](assets/images/double_bond.png) Double bond 
It is possible to draw new double bonds using this tool, however the main purpose of it is to change subtype of the
double bond. It is especially useful, if the default double bond behavior makes unwanted constrains for user, so the 
problem can
be easily fixed manually. Repeatedly clicking on the existing bond leads to the following bond type circulation:

auto shift ⮕ left-shifted ⮕ centered ⮕ right-shifted ⮕ auto shift

## ![Upper bond button](assets/images/upper_bond.png) Upper bond 
This tool is used to draw or set directly wedged upper bond, or change the upper bond subtype. Repeatedly clicking on 
the existing bond leads to the following bond type circulation:

directly wedged upper ⮕ unwedged upper ⮕ reversed wedged upper ⮕ directly wedged upper

## ![Lower bond button](assets/images/lower_bond.png) Lower bond 
This tool is used to draw or set directly wedged lower bond, or change the lower bond subtype. Repeatedly clicking on 
the existing bond leads to the following bond type circulation:

directly wedged lower ⮕ unwedged lower ⮕ reversed wedged lower ⮕ directly wedged lower

# ![Eraser button](assets/images/eraser.png) Eraser 
It deletes atoms and bonds. If some atom is deleted, its bonds are deleted automatically. If all bonds of the implicit 
carbon are deleted, the latter is displayed as CH<sub>4</sub>.

# ![Atom text button](assets/images/atom_text.png) Atom text 
This tool allows to set arbitraty text of the chemical node. It can be not any atom, but also a functional group. If the
named functional group is from the list (Me, Et, Pr, Bu, Ph, Bn, Ac, Bz, Ts), it will be chemically parsed correctly. 
The same is valid for any combination of atoms, named groups, brackets and subscript indices. By now, the list of named 
groups can be extended only programmatically, but the corresponding IU feature is planned.

# ![Carbocycle menu](assets/images/carbocycles.png) Carbocycle dropdown menu 
The carbocycle menu contains the five most frequently used cycles:

![Eraser button](assets/images/benzene.png)
![Eraser button](assets/images/cyclopentane.png)
![Eraser button](assets/images/cyclohexane.png)
![Eraser button](assets/images/cycloheptane.png)

Carbocycles can be stacked by corners or by edges. To stack by corner, select the desired carbocycle from the dropdown 
menu, then click on some already existing atom and drag to certain direction to specify the angle. The cycle will follow 
the cursor. After that release the left mouse button. To stack by edge, click on some bond and drag the cursor towards
the side where the cycle should be placed. Notice that the carbocycle atoms are sticky while drawing. It means that if 
its atom overlaps or very close to an already existing atom, the atoms will be merged.
One can fuse multiple benzene rings as well, however the correct double bond alternation is not always possible, and 
depends on the drawing sequence.

# Undo, redo
The app fully supports this functionality. Use `Ctrl + Z` and `Ctrl + Y` (or `Ctrl + Shift + Z`) for undo and redo 
respectively.

# ![Eraser button](assets/images/file.png) File menu
## New
Deletes all drawings on canvas.

## Save as .svg
Saves the image in SVG format.

## Save as .json
Saves the drawings in the custom JSON format. Later the file can be opened by this app.

## Open .json file
Open previously saved JSON file.