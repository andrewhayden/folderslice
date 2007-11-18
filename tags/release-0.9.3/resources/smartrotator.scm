;  Rotator
;   Rotates the selected layer with a given angle, creating new layers for each step
;   Based on the ani-rotate script made by Eric Coutier.

(define (script-fu-rotator-withbg img inLayer inTotAngle inIncCount)
	(set! pi 3.141592654)

	;duplicate the original image
	(set! img (car (gimp-channel-ops-duplicate img)))  
	(set! width (car (gimp-image-width img)))
	(set! height (car (gimp-image-height img)))
	(set! srcLayer (car (gimp-image-get-active-layer img)))
	
	;it begins here
	(gimp-undo-push-group-start img)
	
	;hide all layers
	(set! layers (car(cdr (gimp-image-get-layers img))))
	(set! nLayers (car (gimp-image-get-layers img)))
	(set! i 0)
	(while (< i nLayers)
		(set! layer (aref layers i))
		(gimp-layer-set-visible layer 0)
		(set! i (+ i 1))
	)

	;do the frames
	(set! counter 0)
	(set! a 0)
	(set! inc (/ inTotAngle inIncCount))
	(while (< counter inIncCount)
		;add background layer
		(set! whiteLayer (car (gimp-layer-new img width height 1 "rotation layer" 100 0)))
		(gimp-image-add-layer img whiteLayer 0)
		(gimp-layer-set-visible whiteLayer TRUE)
		(gimp-selection-all img)
		(gimp-drawable-fill whiteLayer BG-IMAGE-FILL)
		(gimp-selection-none img)

		(set! aRad (* (/ a 180) pi))
		(set! newLayer (car (gimp-layer-copy srcLayer FALSE)))
		(gimp-image-add-layer img newLayer 0)
		(gimp-layer-set-visible newLayer TRUE)

                ;rotates the new layer
		(gimp-rotate newLayer TRUE aRad)

		(set! resLayer (car (gimp-image-merge-visible-layers img 1)))
		(gimp-layer-set-visible resLayer FALSE)

		(set! a (+ a inc))
		(set! counter (+ counter 1))
	)

	(gimp-image-remove-layer img srcLayer)

	;show all layers
	(set! layers (car(cdr (gimp-image-get-layers img))))
	(set! nLayers (car (gimp-image-get-layers img)))
	(set! i 0)
	(while (< i nLayers)
		(set! layer (aref layers i))
		(gimp-layer-set-visible layer 1)
		(set! i (+ i 1))
	)

	;it ends here
	(gimp-undo-push-group-end img)
	(gimp-display-new img)
)

(script-fu-register "script-fu-rotator-withbg"
		    "<Image>/Script-Fu/Transforms/Rotator (With BG)..."
		    "Rotates the selected layer with a given angle, creating new layers for each step, preserving background color"
		    "Andrew Hayden (based on original by Joacim Breiler)"
		    "Andrew Hayden (based on original by Joacim Breiler)"
		    "2007-05-29 (Original work by Joacim Breiler: 2006-09-23)"
		    ""
		    SF-IMAGE "image" 0
		    SF-DRAWABLE "drawable" 0
		    SF-ADJUSTMENT "total angle" '(360 0 360 1 10  0 0)
		    SF-ADJUSTMENT "inc number" '(15 2 360 1 2  0 1)
		    ;SF-TOGGLE "vertical" FALSE
		    ;SF-TOGGLE "add background to each frame" TRUE
		    ;SF-TOGGLE "flatten before anim" TRUE
)
